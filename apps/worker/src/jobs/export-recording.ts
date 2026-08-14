import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type {
  ClipAspectRatio,
  ClipFitMode,
  JobStatus as DomainJobStatus,
} from '@mintreels/domain';
import { Job } from '@mintreels/db';
import { probeDurationMs, renderClipVideo, segmentsToAss } from '@mintreels/media';
import { ClipFitMode as ClipFitModeEnum, ClipRatio, ClipStatus, JobStatus, JobType } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';
import { storeVideoThumbnail } from '../pipeline/video-thumbnail';

/** Match `@mintreels/media` TARGET_SIZE — ASS PlayRes must equal the encoded frame. */
const EXPORT_FRAME_SIZE: Record<ClipAspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

const EXPORT_CANCELLED = 'EXPORT_CANCELLED';

export interface ExportRecordingPayload {
  recordingId: number;
  jobId: number;
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
}

async function writeStreamToFile(stream: ReadableStream, filePath: string): Promise<void> {
  await pipeline(
    Readable.fromWeb(stream as unknown as WebReadableStream),
    createWriteStream(filePath),
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function failMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return 'Recording export failed';
}

function resolveAspectRatio(
  payload: ExportRecordingPayload,
  recordingAspect: string | null | undefined,
): ClipAspectRatio {
  const candidate = payload.aspectRatio ?? recordingAspect ?? ClipRatio.Vertical;
  if (
    candidate === ClipRatio.Vertical ||
    candidate === ClipRatio.Square ||
    candidate === ClipRatio.Widescreen
  ) {
    return candidate;
  }
  return ClipRatio.Vertical;
}

function resolveFitMode(
  payload: ExportRecordingPayload,
  recordingFit: string | null | undefined,
): ClipFitMode {
  const candidate = payload.fitMode ?? recordingFit ?? ClipFitModeEnum.Fit;
  if (candidate === ClipFitModeEnum.Fit || candidate === ClipFitModeEnum.Fill) {
    return candidate;
  }
  return ClipFitModeEnum.Fit;
}

async function isSuperseded(
  deps: WorkerDeps,
  recordingId: number,
  jobId: number,
): Promise<boolean> {
  const latest = await deps.jobs.findLatestByRecordingAndType(
    recordingId,
    JobType.ExportRecording,
  );
  return latest == null || latest.id !== jobId;
}

function isCancelledJob(job: Job | null): boolean {
  return job?.errorCode === EXPORT_CANCELLED;
}

/** Reload job; abort if cancelled or superseded. Does not mutate job when cancelled. */
async function getAbortReason(
  deps: WorkerDeps,
  recordingId: number,
  jobId: number,
): Promise<'cancelled' | 'superseded' | null> {
  const job = await deps.jobs.findOneBy({ id: jobId });
  if (isCancelledJob(job)) {
    return 'cancelled';
  }
  if (await isSuperseded(deps, recordingId, jobId)) {
    return 'superseded';
  }
  return null;
}

async function markJobSuccess(deps: WorkerDeps, job: Job): Promise<void> {
  const fresh = await deps.jobs.findOneBy({ id: job.id });
  if (isCancelledJob(fresh)) {
    return;
  }
  job.status = JobStatus.Success;
  job.finishedAt = new Date();
  job.error = null;
  job.errorCode = null;
  await deps.jobs.save(job);
}

async function abortIfNeeded(
  deps: WorkerDeps,
  job: Job,
  recordingId: number,
): Promise<DomainJobStatus | null> {
  const reason = await getAbortReason(deps, recordingId, job.id);
  if (reason === 'cancelled') {
    return 'success';
  }
  if (reason === 'superseded') {
    await markJobSuccess(deps, job);
    return 'success';
  }
  return null;
}

/** Mark running only if the job was not cancelled concurrently. */
async function tryMarkRunning(
  deps: WorkerDeps,
  job: Job,
  recordingId: number,
): Promise<DomainJobStatus | null> {
  const early = await abortIfNeeded(deps, job, recordingId);
  if (early) {
    return early;
  }

  const startedAt = job.startedAt ?? new Date();
  const nextAttempt = job.attempt + 1;
  const result = await deps.jobs
    .createQueryBuilder()
    .update(Job)
    .set({
      status: JobStatus.Running,
      startedAt,
      attempt: nextAttempt,
      error: null,
      errorCode: null,
      finishedAt: null,
    })
    .where('id = :id', { id: job.id })
    .andWhere('(error_code IS NULL OR error_code <> :cancelled)', {
      cancelled: EXPORT_CANCELLED,
    })
    .execute();

  if (!result.affected || result.affected === 0) {
    return 'success';
  }

  job.status = JobStatus.Running;
  job.startedAt = startedAt;
  job.attempt = nextAttempt;
  job.error = null;
  job.errorCode = null;
  job.finishedAt = null;
  return null;
}

export async function exportRecording(
  payload: ExportRecordingPayload,
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
    return 'success';
  }

  const job = await deps.jobs.findOneBy({ id: payload.jobId });
  if (!job) {
    return 'success';
  }

  if (isCancelledJob(job)) {
    return 'success';
  }

  const earlyAbort = await abortIfNeeded(deps, job, payload.recordingId);
  if (earlyAbort) {
    return earlyAbort;
  }

  if (recording.exportStatus === ClipStatus.Ready && recording.exportStorageKey) {
    if (!recording.exportThumbnailStorageKey) {
      const thumbKey = await storeVideoThumbnail({
        storage: deps.storage,
        videoStorageKey: recording.exportStorageKey,
        localVideoPath: null,
        tmpDir: null,
        uploadKey: `recording-${String(recording.id)}-export-thumb.jpg`,
      });
      if (thumbKey) {
        const aborted = await abortIfNeeded(deps, job, payload.recordingId);
        if (aborted) {
          return aborted;
        }
        recording.exportThumbnailStorageKey = thumbKey;
        await deps.recordings.save(recording);
      }
    }
    if (job.status !== JobStatus.Success && !isCancelledJob(job)) {
      const fresh = await deps.jobs.findOneBy({ id: job.id });
      if (!isCancelledJob(fresh) && fresh) {
        fresh.status = JobStatus.Success;
        fresh.finishedAt = fresh.finishedAt ?? new Date();
        fresh.error = null;
        fresh.errorCode = null;
        await deps.jobs.save(fresh);
      }
    }
    return 'success';
  }

  const beforeRun = await tryMarkRunning(deps, job, payload.recordingId);
  if (beforeRun) {
    return beforeRun;
  }

  const beforeStatus = await abortIfNeeded(deps, job, payload.recordingId);
  if (beforeStatus) {
    return beforeStatus;
  }

  recording.exportStatus = ClipStatus.Rendering;
  await deps.recordings.save(recording);

  const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-export-'));
  const videoPath = join(tmpDir, 'source.bin');
  const outputPath = join(tmpDir, `recording-${String(recording.id)}-export.mp4`);
  const assPath = join(tmpDir, `recording-${String(recording.id)}-export.ass`);

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }
    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }

    const afterDownload = await abortIfNeeded(deps, job, payload.recordingId);
    if (afterDownload) {
      return afterDownload;
    }

    const aspectRatio = resolveAspectRatio(payload, recording.exportAspectRatio);
    const fitMode = resolveFitMode(payload, recording.exportFitMode);
    const burnSubtitles = payload.burnSubtitles ?? recording.exportBurnSubtitles ?? true;
    const frame = EXPORT_FRAME_SIZE[aspectRatio];

    let endMs = recording.durationMs;
    if (endMs == null || endMs <= 0) {
      endMs = await probeDurationMs(videoPath);
    }
    if (endMs <= 0) {
      throw new Error('Could not resolve recording duration');
    }

    let burnAssPath: string | undefined;
    if (burnSubtitles) {
      const segments = await deps.segments.listByRecordingId(payload.recordingId);
      const ass = segmentsToAss(segments, {
        startMs: 0,
        endMs,
        rebaseToClip: false,
        playResX: frame.width,
        playResY: frame.height,
      });
      if (ass.includes('Dialogue:')) {
        await writeFile(assPath, ass, 'utf8');
        burnAssPath = assPath;
      }
    }

    await renderClipVideo({
      inputPath: videoPath,
      outputPath,
      startMs: 0,
      endMs,
      aspectRatio,
      fitMode,
      ...(burnAssPath ? { vttPath: burnAssPath } : {}),
    });

    const afterRender = await abortIfNeeded(deps, job, payload.recordingId);
    if (afterRender) {
      return afterRender;
    }

    const stillThere = await deps.recordings.findOneBy({ id: payload.recordingId });
    if (!stillThere) {
      await markJobSuccess(deps, job);
      return 'success';
    }

    // Filestack store still buffers the body once; stream from disk avoids a prior readFile copy.
    const stored = await deps.storage.upload({
      key: `recording-${String(recording.id)}-export.mp4`,
      body: Readable.toWeb(createReadStream(outputPath)) as ReadableStream,
      contentType: 'video/mp4',
    });

    const afterUpload = await abortIfNeeded(deps, job, payload.recordingId);
    if (afterUpload) {
      return afterUpload;
    }

    const thumbKey = await storeVideoThumbnail({
      storage: deps.storage,
      videoStorageKey: stored.key,
      localVideoPath: outputPath,
      tmpDir,
      uploadKey: `recording-${String(recording.id)}-export-thumb.jpg`,
    });

    const beforeWrite = await abortIfNeeded(deps, job, payload.recordingId);
    if (beforeWrite) {
      return beforeWrite;
    }

    const latestRecording = await deps.recordings.findOneBy({ id: payload.recordingId });
    if (!latestRecording) {
      await markJobSuccess(deps, job);
      return 'success';
    }

    latestRecording.exportStorageKey = stored.key;
    latestRecording.exportThumbnailStorageKey = thumbKey;
    latestRecording.exportAspectRatio = aspectRatio as typeof latestRecording.exportAspectRatio;
    latestRecording.exportFitMode = fitMode as typeof latestRecording.exportFitMode;
    latestRecording.exportBurnSubtitles = burnSubtitles;
    latestRecording.exportStatus = ClipStatus.Ready;
    await deps.recordings.save(latestRecording);

    await markJobSuccess(deps, job);
    return 'success';
  } catch (error: unknown) {
    const message = failMessage(error);
    const abort = await abortIfNeeded(deps, job, payload.recordingId);
    if (abort) {
      return abort;
    }
    const current = await deps.recordings.findOneBy({ id: payload.recordingId });
    if (!current) {
      await markJobSuccess(deps, job);
      return 'success';
    }
    current.exportStatus = ClipStatus.Failed;
    await deps.recordings.save(current);
    const fresh = await deps.jobs.findOneBy({ id: job.id });
    if (isCancelledJob(fresh)) {
      return 'success';
    }
    job.status = JobStatus.Failed;
    job.finishedAt = new Date();
    job.error = message;
    job.errorCode = 'EXPORT_RECORDING_FAILED';
    await deps.jobs.save(job);
    throw error instanceof Error ? error : new Error(message);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
