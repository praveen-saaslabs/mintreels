import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { mixVoiceoverOntoVideo, trimVideo } from '@mintreels/media';
import { ClipStatus, JobStatus, JobType, type ClipVoiceover } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';
import { storeVideoThumbnail } from '../pipeline/video-thumbnail';

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

function voiceoverScript(voiceover: ClipVoiceover, fallbackTitle: string): string {
  const title = (voiceover.titleText ?? fallbackTitle).trim();
  const cta = voiceover.ctaText?.trim() ?? '';
  if (title !== '' && cta !== '') {
    return `${title}. ${cta}`;
  }
  if (title !== '') {
    return title;
  }
  return cta;
}

function ttsCacheKey(voiceId: string, text: string): string {
  const hash = createHash('sha256').update(`${voiceId}\n${text}`).digest('hex').slice(0, 32);
  return `tts-cache/${hash}.mp3`;
}

async function resolveVoiceoverAudio(
  deps: WorkerDeps,
  voiceover: ClipVoiceover,
  text: string,
  outPath: string,
): Promise<void> {
  const cacheKey = ttsCacheKey(voiceover.voiceId, text);
  try {
    const cached = await deps.storage.download(cacheKey);
    await writeStreamToFile(cached, outPath);
    if (await fileExists(outPath)) {
      return;
    }
  } catch {
    // Cache miss — synthesize below.
  }

  const spoken = await deps.voice.synthesize({
    text,
    voiceId: voiceover.voiceId,
    format: 'mp3',
  });
  await writeFile(outPath, spoken.audio);
  try {
    await deps.storage.upload({
      key: cacheKey,
      body: spoken.audio,
      contentType: spoken.contentType,
    });
  } catch {
    // Cache upload is best-effort.
  }
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
  const trimmedPath = join(tmpDir, `clip-${String(clip.id)}-trim.mp4`);
  const outputPath = join(tmpDir, `clip-${String(clip.id)}.mp4`);
  const voicePath = join(tmpDir, 'voiceover.mp3');

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
      outputPath: trimmedPath,
      startMs: payload.startMs,
      endMs: payload.endMs,
    });

    let finalPath = trimmedPath;
    const voiceover = clip.voiceover;
    if (voiceover?.enabled) {
      const script = voiceoverScript(voiceover, clip.title);
      if (script.trim() === '') {
        throw new Error('Voiceover text is empty');
      }
      await resolveVoiceoverAudio(deps, voiceover, script, voicePath);
      await mixVoiceoverOntoVideo({
        videoPath: trimmedPath,
        voiceoverPath: voicePath,
        outputPath,
        placement: voiceover.placement,
      });
      finalPath = outputPath;
    }

    const body = await readFile(finalPath);
    const stored = await deps.storage.upload({
      key: `clip-${String(clip.id)}.mp4`,
      body,
      contentType: 'video/mp4',
    });

    const thumbKey = await storeVideoThumbnail({
      storage: deps.storage,
      videoStorageKey: stored.key,
      localVideoPath: finalPath,
      tmpDir,
      uploadKey: `clip-${String(clip.id)}-thumb.jpg`,
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
