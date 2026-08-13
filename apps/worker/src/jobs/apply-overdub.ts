import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { replaceAudioRange } from '@mintreels/media';
import { JobStatus } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';

export interface ApplyOverdubPayload {
  recordingId: number;
  segmentId: number;
  jobId: number;
  voiceId: string;
  text: string;
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
  return 'Overdub failed';
}

function ttsCacheKey(voiceId: string, text: string): string {
  const hash = createHash('sha256').update(`${voiceId}\n${text}`).digest('hex').slice(0, 32);
  return `tts-cache/${hash}.mp3`;
}

async function resolveSpeechAudio(
  deps: WorkerDeps,
  voiceId: string,
  text: string,
  outPath: string,
): Promise<void> {
  const cacheKey = ttsCacheKey(voiceId, text);
  try {
    const cached = await deps.storage.download(cacheKey);
    await writeStreamToFile(cached, outPath);
    if (await fileExists(outPath)) {
      return;
    }
  } catch {
    // Cache miss.
  }

  const spoken = await deps.voice.synthesize({
    text,
    voiceId,
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
    // Best-effort cache.
  }
}

export async function applyOverdub(
  payload: ApplyOverdubPayload,
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
    return 'success';
  }

  const segment = await deps.segments.findOneBy({
    id: payload.segmentId,
    recordingId: payload.recordingId,
  });
  if (!segment) {
    return 'success';
  }

  const job = await deps.jobs.findOneBy({ id: payload.jobId });
  if (job) {
    job.status = JobStatus.Running;
    job.startedAt = job.startedAt ?? new Date();
    job.attempt += 1;
    job.error = null;
    job.errorCode = null;
    job.finishedAt = null;
    await deps.jobs.save(job);
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-overdub-'));
  const videoPath = join(tmpDir, 'source.bin');
  const voicePath = join(tmpDir, 'line.mp3');
  const outputPath = join(tmpDir, 'overdubbed.mp4');

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }

    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }

    const text = payload.text.trim() || segment.text.trim();
    if (text === '') {
      throw new Error('Overdub text is empty');
    }

    await resolveSpeechAudio(deps, payload.voiceId, text, voicePath);
    await replaceAudioRange({
      videoPath,
      replacementAudioPath: voicePath,
      outputPath,
      startMs: payload.startMs,
      endMs: payload.endMs,
    });

    const body = await readFile(outputPath);
    const versionKey = `recording-${String(recording.id)}-overdub-${String(Date.now())}.mp4`;
    const stored = await deps.storage.upload({
      key: versionKey,
      body,
      contentType: 'video/mp4',
    });

    recording.storageKey = stored.key;
    await deps.recordings.save(recording);

    if (segment.text !== text) {
      segment.text = text;
      await deps.segments.save(segment);
    }

    if (job) {
      job.status = JobStatus.Success;
      job.finishedAt = new Date();
      job.error = null;
      job.errorCode = null;
      job.metadata = {
        ...(job.metadata ?? {}),
        segmentId: payload.segmentId,
        voiceId: payload.voiceId,
      };
      await deps.jobs.save(job);
    }

    return 'success';
  } catch (error: unknown) {
    const message = failMessage(error);
    if (job) {
      job.status = JobStatus.Failed;
      job.finishedAt = new Date();
      job.error = message;
      job.errorCode = 'APPLY_OVERDUB_FAILED';
      await deps.jobs.save(job);
    }
    throw error instanceof Error ? error : new Error(message);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
