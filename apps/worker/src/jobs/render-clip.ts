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
import { renderClipVideo, segmentsToAss } from '@mintreels/media';
import { ClipFitMode as ClipFitModeEnum, ClipRatio, ClipStatus, JobStatus, JobType } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';
import { storeVideoThumbnail } from '../pipeline/video-thumbnail';

/** Match `@mintreels/media` TARGET_SIZE — ASS PlayRes must equal the encoded frame. */
const CLIP_FRAME_SIZE: Record<ClipAspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export interface RenderClipPayload {
  clipId: number;
  recordingId: number;
  jobId?: number;
  startMs: number;
  endMs: number;
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
  return 'Clip render failed';
}

function resolveAspectRatio(
  payload: RenderClipPayload,
  clipAspect: string | null | undefined,
): ClipAspectRatio {
  const candidate = payload.aspectRatio ?? clipAspect ?? ClipRatio.Vertical;
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
  payload: RenderClipPayload,
  clipFit: string | null | undefined,
): ClipFitMode {
  const candidate = payload.fitMode ?? clipFit ?? ClipFitModeEnum.Fit;
  if (candidate === ClipFitModeEnum.Fit || candidate === ClipFitModeEnum.Fill) {
    return candidate;
  }
  return ClipFitModeEnum.Fit;
}

export async function renderClip(payload: RenderClipPayload, deps: WorkerDeps): Promise<DomainJobStatus> {
  const clip = await deps.clips.findOneBy({ id: payload.clipId });
  if (!clip) {
    return 'success';
  }

  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
    return 'success';
  }

  const job =
    payload.jobId !== undefined
      ? await deps.jobs.findOneBy({ id: payload.jobId })
      : await deps.jobs.findLatestByRecordingAndType(payload.recordingId, JobType.RenderClip);

  if (clip.status === ClipStatus.Ready && clip.storageKey) {
    if (!clip.thumbnailStorageKey) {
      const thumbKey = await storeVideoThumbnail({
        storage: deps.storage,
        videoStorageKey: clip.storageKey,
        localVideoPath: null,
        tmpDir: null,
        uploadKey: `clip-${String(clip.id)}-thumb.jpg`,
      });
      if (thumbKey) {
        clip.thumbnailStorageKey = thumbKey;
        await deps.clips.save(clip);
      }
    }
    if (job && job.status !== JobStatus.Success) {
      job.status = JobStatus.Success;
      job.finishedAt = job.finishedAt ?? new Date();
      job.error = null;
      job.errorCode = null;
      await deps.jobs.save(job);
    }
    return 'success';
  }

  if (job) {
    job.status = JobStatus.Running;
    job.startedAt = job.startedAt ?? new Date();
    job.attempt += 1;
    job.error = null;
    job.errorCode = null;
    job.finishedAt = null;
    await deps.jobs.save(job);
  }

  clip.status = ClipStatus.Rendering;
  await deps.clips.save(clip);

  const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-clip-'));
  const videoPath = join(tmpDir, 'source.bin');
  const outputPath = join(tmpDir, `clip-${String(clip.id)}.mp4`);
  // ASS (not SRT/VTT): explicit PlayRes avoids giant FontSize from SRT’s 384×288 default.
  const assPath = join(tmpDir, `clip-${String(clip.id)}.ass`);

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }
    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }

    const aspectRatio = resolveAspectRatio(payload, clip.aspectRatio);
    const fitMode = resolveFitMode(payload, clip.fitMode);
    const burnSubtitles = payload.burnSubtitles ?? clip.burnSubtitles ?? true;
    const frame = CLIP_FRAME_SIZE[aspectRatio];

    let burnAssPath: string | undefined;
    if (burnSubtitles) {
      const segments = await deps.segments.listByRecordingId(payload.recordingId);
      const ass = segmentsToAss(segments, {
        startMs: payload.startMs,
        endMs: payload.endMs,
        rebaseToClip: true,
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
      startMs: payload.startMs,
      endMs: payload.endMs,
      aspectRatio,
      fitMode,
      ...(burnAssPath ? { vttPath: burnAssPath } : {}),
    });

    // Filestack store still buffers the body once; stream from disk avoids a prior readFile copy.
    const stored = await deps.storage.upload({
      key: `clip-${String(clip.id)}.mp4`,
      body: Readable.toWeb(createReadStream(outputPath)) as ReadableStream,
      contentType: 'video/mp4',
    });

    const thumbKey = await storeVideoThumbnail({
      storage: deps.storage,
      videoStorageKey: stored.key,
      localVideoPath: outputPath,
      tmpDir,
      uploadKey: `clip-${String(clip.id)}-thumb.jpg`,
    });

    clip.storageKey = stored.key;
    clip.thumbnailStorageKey = thumbKey;
    clip.aspectRatio = aspectRatio as typeof clip.aspectRatio;
    clip.fitMode = fitMode as typeof clip.fitMode;
    clip.burnSubtitles = burnSubtitles;
    clip.status = ClipStatus.Ready;
    await deps.clips.save(clip);

    if (job) {
      job.status = JobStatus.Success;
      job.finishedAt = new Date();
      job.error = null;
      job.errorCode = null;
      await deps.jobs.save(job);
    }

    return 'success';
  } catch (error: unknown) {
    const message = failMessage(error);
    clip.status = ClipStatus.Failed;
    await deps.clips.save(clip);
    if (job) {
      job.status = JobStatus.Failed;
      job.finishedAt = new Date();
      job.error = message;
      job.errorCode = 'RENDER_CLIP_FAILED';
      await deps.jobs.save(job);
    }
    throw error instanceof Error ? error : new Error(message);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
