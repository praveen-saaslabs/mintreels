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
  type Recording,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import { parseFilestackRef } from '@mintreels/storage';
import {
  JOB_STEP_NAMES,
  JobStatus,
  JobStepStatus,
  JobType,
  RecordingStatus,
} from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { QUEUE_PROVIDER } from '../providers/provider-tokens';
import type { CreateRecordingRequest } from './recordings.dto';

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

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'VIDEO_INGEST enqueued',
        metadata: null,
      }),
    );

    await this.queue.enqueue({
      id: `ingest-${String(job.id)}`,
      name: 'ingest-video',
      payload: { recordingId: recording.id, jobId: job.id },
      maxAttempts: 3,
    });

    return { id: recording.id, projectId: project.id, jobId: job.id };
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
      transcript: transcript
        ? { id: transcript.id, language: transcript.language, segmentCount: segments.length }
        : null,
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
    await this.recordings.remove(recording);
  }

  async addToGlobalKnowledgeBase(_id: number, _userId: number): Promise<never> {
    throw new HttpError(501, 'recordingsService.addToGlobalKnowledgeBase is not implemented');
  }
}
