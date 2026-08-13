import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { generateThumbnail, trimVideo } from '@mintreels/media';
import { ClipStatus, JobStatus, JobType } from '@mintreels/schema';
import type { StorageProvider } from '@mintreels/storage';
import type { WorkerDeps } from '../pipeline/deps';

export interface RenderClipPayload {
  clipId: number;
  recordingId: number;
  jobId?: number;
  startMs: number;
  endMs: number;
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

async function storeClipThumbnail(input: {
  storage: StorageProvider;
  videoStorageKey: string;
  localVideoPath: string | null;
  clipId: number;
  tmpDir: string | null;
}): Promise<string | null> {
  try {
    const fromProvider = await input.storage.createVideoThumbnail(input.videoStorageKey);
    return fromProvider.key;
  } catch {
    // Filestack video convert may be unavailable; fall back to a local frame upload.
  }
  if (input.localVideoPath === null || input.tmpDir === null) {
    return null;
  }
  try {
    const thumbPath = join(input.tmpDir, `clip-${String(input.clipId)}.jpg`);
    await generateThumbnail({ videoPath: input.localVideoPath, outputPath: thumbPath, atMs: 0 });
    const body = await readFile(thumbPath);
    const stored = await input.storage.upload({
      key: `clip-${String(input.clipId)}-thumb.jpg`,
      body,
      contentType: 'image/jpeg',
    });
    return stored.key;
  } catch {
    return null;
  }
}

export async function renderClip(payload: RenderClipPayload, deps: WorkerDeps): Promise<DomainJobStatus> {
  const clip = await deps.clips.findOneBy({ id: payload.clipId });
  if (!clip) {
    throw new Error('Clip not found');
  }

  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
    throw new Error('Recording not found');
  }

  const job =
    payload.jobId !== undefined
      ? await deps.jobs.findOneBy({ id: payload.jobId })
      : await deps.jobs.findLatestByRecordingAndType(payload.recordingId, JobType.RenderClip);

  if (clip.status === ClipStatus.Ready && clip.storageKey) {
    if (!clip.thumbnailStorageKey) {
      const thumbKey = await storeClipThumbnail({
        storage: deps.storage,
        videoStorageKey: clip.storageKey,
        localVideoPath: null,
        clipId: clip.id,
        tmpDir: null,
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

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }
    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }

    await trimVideo({
      inputPath: videoPath,
      outputPath,
      startMs: payload.startMs,
      endMs: payload.endMs,
    });

    const body = await readFile(outputPath);
    const stored = await deps.storage.upload({
      key: `clip-${String(clip.id)}.mp4`,
      body,
      contentType: 'video/mp4',
    });

    const thumbKey = await storeClipThumbnail({
      storage: deps.storage,
      videoStorageKey: stored.key,
      localVideoPath: outputPath,
      clipId: clip.id,
      tmpDir,
    });

    clip.storageKey = stored.key;
    clip.thumbnailStorageKey = thumbKey;
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
