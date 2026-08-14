import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import {
  ClipRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
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
  ClipFitMode,
  ClipRatio,
  ClipStatus,
  JOB_STEP_NAMES,
  JobStatus,
  JobStepName,
  JobStepStatus,
  JobType,
  RecordingStatus,
} from '@mintreels/schema';
import type { Ownership } from '../auth/auth.types';
import { HttpError } from '../common/http-error';
import { GuestQuotaService } from '../guest/guest-quota.service';
import { publicPlaybackUrl } from '../common/playback-url';
import {
  QUEUE_PROVIDER,
  TRANSCRIPT_VECTOR_STORE_PROVIDER,
  VECTOR_STORE_PROVIDER,
} from '../providers/provider-tokens';
import { toPublicTranscript } from '../transcripts/public-transcript';
import type { CreateRecordingRequest, ExportRecordingRequest } from './recordings.dto';

const EXPORT_QUEUE_MAX_ATTEMPTS = 3;
const DEFAULT_EXPORT_ASPECT = ClipRatio.Vertical;
const DEFAULT_EXPORT_FIT = ClipFitMode.Fit;
const DEFAULT_EXPORT_BURN = true;
const EXPORT_CANCELLED = 'EXPORT_CANCELLED';

type PreviousExportSnapshot = {
  exportStorageKey: string | null;
  exportThumbnailStorageKey: string | null;
  exportStatus: ClipStatus | null;
  exportAspectRatio: ClipRatio | null;
  exportFitMode: ClipFitMode | null;
  exportBurnSubtitles: boolean | null;
};

function snapshotPreviousExport(recording: Recording): PreviousExportSnapshot {
  return {
    exportStorageKey: recording.exportStorageKey,
    exportThumbnailStorageKey: recording.exportThumbnailStorageKey,
    exportStatus: recording.exportStatus,
    exportAspectRatio: recording.exportAspectRatio,
    exportFitMode: recording.exportFitMode,
    exportBurnSubtitles: recording.exportBurnSubtitles,
  };
}

function parsePreviousExport(metadata: Record<string, unknown> | null): PreviousExportSnapshot {
  const raw = metadata?.previousExport;
  if (typeof raw !== 'object' || raw === null) {
    return {
      exportStorageKey: null,
      exportThumbnailStorageKey: null,
      exportStatus: null,
      exportAspectRatio: null,
      exportFitMode: null,
      exportBurnSubtitles: null,
    };
  }
  const prev = raw as Record<string, unknown>;
  const status =
    prev.exportStatus === ClipStatus.Queued ||
    prev.exportStatus === ClipStatus.Rendering ||
    prev.exportStatus === ClipStatus.Ready ||
    prev.exportStatus === ClipStatus.Failed
      ? prev.exportStatus
      : null;
  const aspect =
    prev.exportAspectRatio === ClipRatio.Vertical ||
    prev.exportAspectRatio === ClipRatio.Square ||
    prev.exportAspectRatio === ClipRatio.Widescreen
      ? prev.exportAspectRatio
      : null;
  const fit =
    prev.exportFitMode === ClipFitMode.Fit || prev.exportFitMode === ClipFitMode.Fill
      ? prev.exportFitMode
      : null;
  return {
    exportStorageKey: typeof prev.exportStorageKey === 'string' ? prev.exportStorageKey : null,
    exportThumbnailStorageKey:
      typeof prev.exportThumbnailStorageKey === 'string' ? prev.exportThumbnailStorageKey : null,
    exportStatus: status,
    exportAspectRatio: aspect,
    exportFitMode: fit,
    exportBurnSubtitles: typeof prev.exportBurnSubtitles === 'boolean' ? prev.exportBurnSubtitles : null,
  };
}

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

function missingIngestSteps(steps: readonly JobStep[]): JobStepName[] {
  const present = new Set(steps.map((step) => step.step));
  return JOB_STEP_NAMES.filter((name) => !present.has(name));
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
    thumbnailUrl: publicPlaybackUrl(recording.thumbnailStorageKey),
    exportStatus: recording.exportStatus,
    exportAspectRatio: recording.exportAspectRatio,
    exportFitMode: recording.exportFitMode,
    exportBurnSubtitles: recording.exportBurnSubtitles,
    exportVideoUrl: publicPlaybackUrl(recording.exportStorageKey),
    exportThumbnailUrl: publicPlaybackUrl(recording.exportThumbnailStorageKey),
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
    private readonly clips: ClipRepository,
    private readonly knowledgeBases: KnowledgeBaseRepository,
    private readonly knowledgeDocuments: KnowledgeDocumentRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
    @Inject(VECTOR_STORE_PROVIDER) private readonly vectorStore: VectorStoreProvider,
    @Inject(TRANSCRIPT_VECTOR_STORE_PROVIDER)
    private readonly transcriptVectorStore: VectorStoreProvider,
    private readonly guestQuota: GuestQuotaService,
  ) {}

  async create(body: CreateRecordingRequest, owner: Ownership) {
    // Guest caps: a new recording also creates a project, so check both.
    await this.guestQuota.assertCanCreateProject(owner);
    await this.guestQuota.assertCanCreateRecording(owner);

    let storageKey: string;
    try {
      storageKey = parseFilestackRef(body.url).url;
    } catch {
      throw new HttpError(400, 'Invalid url');
    }

    const project = await this.projects.save(
      this.projects.create({
        ...owner,
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
        thumbnailStorageKey: null,
        exportStorageKey: null,
        exportThumbnailStorageKey: null,
        exportStatus: null,
        exportAspectRatio: null,
        exportFitMode: null,
        exportBurnSubtitles: null,
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

  async retry(id: number, owner: Ownership) {
    const recording = await this.recordings.findByIdForOwner(id, owner);
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

    const retryGeneration = retryGenerationFromMetadata(job.metadata);
    const steps = await this.jobSteps.listByJobId(job.id);
    const missingSteps = missingIngestSteps(steps);
    const readyNeedsTranscriptIndex =
      recording.status === RecordingStatus.Ready &&
      missingSteps.includes(JobStepName.TranscriptEmbeddings);
    if (!isRetryableFailure(recording, job) && !readyNeedsTranscriptIndex) {
      throw new HttpError(409, 'NOT_RETRYABLE');
    }

    if (missingSteps.length > 0) {
      await this.jobSteps.save(
        missingSteps.map((step) =>
          this.jobSteps.create({
            jobId: job.id,
            step,
            status: JobStepStatus.Pending,
            attempt: 0,
            maxAttempts: DEFAULT_MAX_ATTEMPTS,
            provider: null,
            providerJobId: null,
            idempotencyKey: [String(recording.id), String(job.id), step, String(retryGeneration)].join(
              ':',
            ),
            result: null,
            error: null,
            startedAt: null,
            completedAt: null,
          }),
        ),
      );
    }

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

  async list(owner: Ownership) {
    const recordings = await this.recordings.listForOwner(owner);
    return recordings.map(toPublicRecording);
  }

  async getById(id: number, owner: Ownership) {
    const recording = await this.recordings.findByIdForOwner(id, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicRecording(recording);
  }

  async exportRecording(id: number, owner: Ownership, body: ExportRecordingRequest) {
    this.requireExportAuth(owner);
    const recording = await this.recordings.findByIdForOwner(id, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    if (recording.storageKey.trim() === '') {
      throw new HttpError(409, 'VIDEO_NOT_AVAILABLE');
    }

    const aspectRatio = body.aspectRatio ?? DEFAULT_EXPORT_ASPECT;
    const fitMode = body.fitMode ?? DEFAULT_EXPORT_FIT;
    const burnSubtitles = body.burnSubtitles ?? DEFAULT_EXPORT_BURN;
    const force = body.force === true;

    if (burnSubtitles) {
      const segments = await this.segments.listByRecordingId(id);
      if (segments.length === 0) {
        throw new HttpError(409, 'TRANSCRIPT_REQUIRED');
      }
    }

    const optionsMatch =
      recording.exportAspectRatio === aspectRatio &&
      recording.exportFitMode === fitMode &&
      recording.exportBurnSubtitles === burnSubtitles;
    const inFlightOrReady =
      recording.exportStatus === ClipStatus.Queued ||
      recording.exportStatus === ClipStatus.Rendering ||
      recording.exportStatus === ClipStatus.Ready;

    if (!force && optionsMatch && inFlightOrReady) {
      const latest = await this.jobs.findLatestByRecordingAndType(id, JobType.ExportRecording);
      return {
        ...toPublicRecording(recording),
        jobId: latest?.id ?? null,
      };
    }

    const previousExport = snapshotPreviousExport(recording);

    recording.exportStorageKey = null;
    recording.exportThumbnailStorageKey = null;
    recording.exportStatus = ClipStatus.Queued;
    recording.exportAspectRatio = aspectRatio;
    recording.exportFitMode = fitMode;
    recording.exportBurnSubtitles = burnSubtitles;
    await this.recordings.save(recording);

    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.ExportRecording,
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
        metadata: {
          aspectRatio,
          fitMode,
          burnSubtitles,
          previousExport,
        },
      }),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'EXPORT_RECORDING enqueued',
        metadata: { aspectRatio, fitMode, burnSubtitles },
      }),
    );

    await this.queue.enqueue({
      id: `export-recording-${String(job.id)}`,
      name: 'export-recording',
      payload: {
        recordingId: recording.id,
        jobId: job.id,
        aspectRatio,
        fitMode,
        burnSubtitles,
      },
      maxAttempts: EXPORT_QUEUE_MAX_ATTEMPTS,
    });

    return {
      ...toPublicRecording(recording),
      jobId: job.id,
    };
  }

  async cancelExportRecording(id: number, owner: Ownership) {
    this.requireExportAuth(owner);
    const recording = await this.recordings.findByIdForOwner(id, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    if (
      recording.exportStatus !== ClipStatus.Queued &&
      recording.exportStatus !== ClipStatus.Rendering
    ) {
      throw new HttpError(409, 'EXPORT_NOT_IN_PROGRESS');
    }

    const job = await this.jobs.findLatestByRecordingAndType(id, JobType.ExportRecording);
    if (!job) {
      throw new HttpError(409, 'EXPORT_NOT_IN_PROGRESS');
    }
    if (job.status === JobStatus.Success || job.status === JobStatus.Failed) {
      throw new HttpError(409, 'EXPORT_NOT_IN_PROGRESS');
    }

    await this.queue.remove(`export-recording-${String(job.id)}`);

    job.status = JobStatus.Failed;
    job.errorCode = EXPORT_CANCELLED;
    job.error = 'Cancelled by user';
    job.finishedAt = new Date();
    await this.jobs.save(job);

    const previous = parsePreviousExport(job.metadata);
    recording.exportStorageKey = previous.exportStorageKey;
    recording.exportThumbnailStorageKey = previous.exportThumbnailStorageKey;
    recording.exportStatus = previous.exportStatus;
    recording.exportAspectRatio = previous.exportAspectRatio;
    recording.exportFitMode = previous.exportFitMode;
    recording.exportBurnSubtitles = previous.exportBurnSubtitles;
    await this.recordings.save(recording);

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_cancelled',
        message: 'EXPORT_RECORDING cancelled by user',
        metadata: { restored: previous.exportStatus },
      }),
    );

    return {
      ...toPublicRecording(recording),
      jobId: job.id,
    };
  }

  async getProcessing(id: number, owner: Ownership) {
    const recording = await this.recordings.findByIdForOwner(id, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const job = await this.jobs.findLatestByRecordingAndType(id, JobType.VideoIngest);
    const steps = job ? await this.jobSteps.listByJobId(job.id) : [];
    const recordingJobs = await this.jobs.find({
      where: { recordingId: id },
      select: ['id'],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const audit = await this.jobAuditLogs.listByJobIds(recordingJobs.map((row) => row.id));
    const transcript = await this.transcripts.findByRecordingId(id);
    const segments = transcript ? await this.segments.listByRecordingId(id) : [];
    const summary = await this.summaries.findByRecordingId(id);
    const hooks = await this.hooks.listByRecordingId(id);

    return {
      recordingId: recording.id,
      status: recording.status,
      videoUrl: publicPlaybackUrl(recording.storageKey),
      audioUrl: publicPlaybackUrl(recording.audioStorageKey),
      thumbnailUrl: publicPlaybackUrl(recording.thumbnailStorageKey),
      exportStatus: recording.exportStatus,
      exportAspectRatio: recording.exportAspectRatio,
      exportFitMode: recording.exportFitMode,
      exportBurnSubtitles: recording.exportBurnSubtitles,
      exportVideoUrl: publicPlaybackUrl(recording.exportStorageKey),
      exportThumbnailUrl: publicPlaybackUrl(recording.exportThumbnailStorageKey),
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
        jobId: row.jobId,
        event: row.event,
        step: row.step,
        message: row.message,
        createdAt: row.createdAt,
      })),
    };
  }

  async remove(id: number, owner: Ownership): Promise<void> {
    const recording = await this.recordings.findByIdForOwner(id, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    // Drop derived indexes before the canonical rows so a delete never leaves stale vectors.
    await Promise.all([
      this.vectorStore.deleteByRecordingId(id),
      this.transcriptVectorStore.deleteByRecordingId(id),
    ]);
    await this.recordings.remove(recording);

    const jobs = await this.jobs.find({ where: { recordingId: id }, select: ['id'] });
    const jobIds = jobs.map((job) => job.id);
    if (jobIds.length > 0) {
      await this.jobAuditLogs.softDelete({ jobId: In(jobIds) });
      await this.jobSteps.softDelete({ jobId: In(jobIds) });
    }
    await this.jobs.softDelete({ recordingId: id });
    await this.clips.softDelete({ recordingId: id });
    await this.hooks.softDelete({ recordingId: id });
    await this.segments.softDelete({ recordingId: id });
    await this.transcripts.softDelete({ recordingId: id });
    await this.summaries.softDelete({ recordingId: id });
    await this.knowledgeDocuments.softDelete({ recordingId: id });
    await this.knowledgeBases.softDelete({ recordingId: id });
    await this.recordings.softRemove(recording);
  }

  async addToGlobalKnowledgeBase(_id: number, _owner: Ownership): Promise<never> {
    throw new HttpError(501, 'recordingsService.addToGlobalKnowledgeBase is not implemented');
  }

  /** Same login gate as clip export — guests preview freely, render after signup. */
  private requireExportAuth(owner: Ownership): void {
    if (owner.userId == null) {
      throw new HttpError(401, 'AUTH_REQUIRED');
    }
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
