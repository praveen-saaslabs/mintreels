import { Inject, Injectable } from '@nestjs/common';
import {
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  ProjectRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Job,
  type JobStep,
  type Recording,
} from '@mintreels/db';
import type { VectorStoreProvider } from '@mintreels/ai';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import { parseFilestackRef } from '@mintreels/storage';
import {
  JOB_STEP_NAMES,
  JobStatus,
  JobStepName,
  JobStepStatus,
  JobType,
  RecordingStatus,
} from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { publicPlaybackUrl } from '../common/playback-url';
import { QUEUE_PROVIDER, VECTOR_STORE_PROVIDER } from '../providers/provider-tokens';
import { toPublicTranscript } from '../transcripts/public-transcript';
import type { CreateRecordingRequest } from './recordings.dto';

function retryGenerationFromMetadata(metadata: Record<string, unknown> | null): number {
  const raw = metadata?.retryGeneration;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) {
    return raw + 1;
  }
  return 1;
}

function isInFlightJob(status: JobStatus): boolean {
  return status === JobStatus.Queued || status === JobStatus.Running;
}

function isRetryableFailure(recording: Recording, job: Job): boolean {
  return (
    recording.status === RecordingStatus.Failed ||
    job.status === JobStatus.Failed ||
    job.status === JobStatus.Partial
  );
}

function shouldResetStep(status: JobStepStatus): boolean {
  return (
    status === JobStepStatus.Failed ||
    status === JobStepStatus.Processing ||
    status === JobStepStatus.Retrying
  );
}

function stepResultKey(result: Record<string, unknown> | null): string | null {
  if (result === null) {
    return null;
  }
  const key = result.key;
  return typeof key === 'string' && key.trim() !== '' ? key : null;
}

function audioKeyFromSteps(steps: readonly JobStep[]): string | null {
  const upload = steps.find((step) => step.step === JobStepName.AudioUpload);
  const extraction = steps.find((step) => step.step === JobStepName.AudioExtraction);
  return stepResultKey(upload?.result ?? null) ?? stepResultKey(extraction?.result ?? null);
}

function resetFailedSteps(
  steps: JobStep[],
  recordingId: number,
  jobId: number,
  retryGeneration: number,
  forceReset: ReadonlySet<JobStepName>,
): JobStep[] {
  const reset: JobStep[] = [];
  for (const step of steps) {
    if (!shouldResetStep(step.status) && !forceReset.has(step.step)) {
      continue;
    }
    step.status = JobStepStatus.Pending;
    step.attempt = 0;
    step.error = null;
    step.result = null;
    step.providerJobId = null;
    step.startedAt = null;
    step.completedAt = null;
    step.idempotencyKey = [
      String(recordingId),
      String(jobId),
      step.step,
      String(retryGeneration),
    ].join(':');
    reset.push(step);
  }
  return reset;
}

function toPublicRecording(recording: Recording) {
  return {
    id: recording.id,
    projectId: recording.projectId,
    title: recording.title,
    originalFilename: recording.originalFilename,
    durationMs: recording.durationMs,
    width: recording.width,
    height: recording.height,
    status: recording.status,
    videoUrl: publicPlaybackUrl(recording.storageKey),
    audioUrl: publicPlaybackUrl(recording.audioStorageKey),
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt,
  };
}

@Injectable()
export class RecordingsService {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly projects: ProjectRepository,
    private readonly jobs: JobRepository,
    private readonly jobSteps: JobStepRepository,
    private readonly jobAuditLogs: JobAuditLogRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly segments: TranscriptSegmentRepository,
    private readonly summaries: SummaryRepository,
    private readonly hooks: HookRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
    @Inject(VECTOR_STORE_PROVIDER) private readonly vectorStore: VectorStoreProvider,
  ) {}

  async create(body: CreateRecordingRequest, userId: number) {
    let storageKey: string;
    try {
      storageKey = parseFilestackRef(body.url).url;
    } catch {
      throw new HttpError(400, 'Invalid url');
    }

    const project = await this.projects.save(
      this.projects.create({
        userId,
        name: body.title,
      }),
    );

    const recording = await this.recordings.save(
      this.recordings.create({
        projectId: project.id,
        title: body.title,
        originalFilename: body.originalFilename,
        storageKey,
        audioStorageKey: null,
        durationMs: null,
        width: null,
        height: null,
        status: RecordingStatus.Processing,
      }),
    );

    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.VideoIngest,
        recordingId: recording.id,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: null,
      }),
    );

    await this.jobSteps.save(
      JOB_STEP_NAMES.map((step) =>
        this.jobSteps.create({
          jobId: job.id,
          step,
          status: JobStepStatus.Pending,
          attempt: 0,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          provider: null,
          providerJobId: null,
          idempotencyKey: `${String(recording.id)}:${String(job.id)}:${step}`,
          result: null,
          error: null,
          startedAt: null,
          completedAt: null,
        }),
      ),
    );

    await this.enqueueIngestJob(
      recording.id,
      job.id,
      `ingest-${String(job.id)}`,
      'VIDEO_INGEST enqueued',
    );

    return { id: recording.id, projectId: project.id, jobId: job.id };
  }

  async retry(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const job = await this.jobs.findLatestByRecordingAndType(id, JobType.VideoIngest);
    if (!job) {
      throw new HttpError(404, 'Not found');
    }

    if (isInFlightJob(job.status)) {
      throw new HttpError(409, 'INGEST_IN_PROGRESS');
    }
    if (!isRetryableFailure(recording, job)) {
      throw new HttpError(409, 'NOT_RETRYABLE');
    }

    const retryGeneration = retryGenerationFromMetadata(job.metadata);
    const steps = await this.jobSteps.listByJobId(job.id);
    if (!recording.audioStorageKey) {
      const recovered = audioKeyFromSteps(steps);
      if (recovered) {
        recording.audioStorageKey = recovered;
      }
    }
    const forceResetAudio =
      recording.audioStorageKey === null || recording.audioStorageKey.trim() === ''
        ? new Set([JobStepName.AudioExtraction, JobStepName.AudioUpload])
        : new Set<JobStepName>();
    const resetSteps = resetFailedSteps(
      steps,
      recording.id,
      job.id,
      retryGeneration,
      forceResetAudio,
    );
    if (resetSteps.length > 0) {
      await this.jobSteps.save(resetSteps);
    }

    job.status = JobStatus.Queued;
    job.attempt = 0;
    job.error = null;
    job.errorCode = null;
    job.errorMetadata = null;
    job.currentStep = null;
    job.startedAt = null;
    job.finishedAt = null;
    if (job.metadata) {
      job.metadata.retryGeneration = retryGeneration;
    } else {
      job.metadata = { retryGeneration };
    }
    await this.jobs.save(job);

    recording.status = RecordingStatus.Processing;
    await this.recordings.save(recording);

    await this.enqueueIngestJob(
      recording.id,
      job.id,
      `ingest-${String(job.id)}-r${String(retryGeneration)}`,
      'VIDEO_INGEST retry enqueued',
    );

    return { id: recording.id, projectId: recording.projectId, jobId: job.id };
  }

  async list(userId: number) {
    const recordings = await this.recordings.listForUser(userId);
    return recordings.map(toPublicRecording);
  }

  async getById(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicRecording(recording);
  }

  async getProcessing(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const job = await this.jobs.findLatestByRecordingAndType(id, JobType.VideoIngest);
    const steps = job ? await this.jobSteps.listByJobId(job.id) : [];
    const audit = job ? await this.jobAuditLogs.listByJobId(job.id) : [];
    const transcript = await this.transcripts.findByRecordingId(id);
    const segments = transcript ? await this.segments.listByRecordingId(id) : [];
    const summary = await this.summaries.findByRecordingId(id);
    const hooks = await this.hooks.listByRecordingId(id);

    return {
      recordingId: recording.id,
      status: recording.status,
      videoUrl: publicPlaybackUrl(recording.storageKey),
      audioUrl: publicPlaybackUrl(recording.audioStorageKey),
      job: job
        ? {
            id: job.id,
            status: job.status,
            currentStep: job.currentStep,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            errorCode: job.errorCode,
            errorMessage: job.error,
          }
        : null,
      steps: steps.map((step) => ({
        step: step.step,
        status: step.status,
        attempt: step.attempt,
        ...(step.provider ? { provider: step.provider } : {}),
      })),
      transcript: transcript ? toPublicTranscript(transcript, segments) : null,
      summary: summary ? { id: summary.id, text: summary.text } : null,
      actionItems: summary?.actionItems ?? [],
      hooks: hooks.map((hook) => ({
        id: hook.id,
        title: hook.title,
        hook: hook.hook,
        reason: hook.reason,
        startMs: hook.startMs,
        endMs: hook.endMs,
        score: hook.score,
      })),
      audit: audit.map((row) => ({
        event: row.event,
        step: row.step,
        message: row.message,
        createdAt: row.createdAt,
      })),
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    // Drop the derived hook vectors before the canonical rows so a delete never leaves stale index data.
    await this.vectorStore.deleteByRecordingId(id);
    await this.recordings.remove(recording);
  }

  async addToGlobalKnowledgeBase(_id: number, _userId: number): Promise<never> {
    throw new HttpError(501, 'recordingsService.addToGlobalKnowledgeBase is not implemented');
  }

  private async enqueueIngestJob(
    recordingId: number,
    jobId: number,
    queueJobId: string,
    message: string,
  ): Promise<void> {
    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId,
        step: null,
        event: 'job_queued',
        message,
        metadata: null,
      }),
    );
    await this.queue.enqueue({
      id: queueJobId,
      name: 'ingest-video',
      payload: { recordingId, jobId },
      maxAttempts: 3,
    });
  }
}
