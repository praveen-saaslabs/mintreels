import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { buildSemanticWindows, transcriptWindowPointId } from '@mintreels/ai';
import type { TranscriptSegment as DomainSegment } from '@mintreels/domain';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { mixVoiceoverOntoVideo } from '@mintreels/media';
import { JobStatus } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';

export interface ApplyRecordingVoiceoverPayload {
  recordingId: number;
  jobId: number;
  voiceId: string;
  placement: 'pre' | 'duck';
  text: string;
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
  return 'Recording voiceover failed';
}

function ttsCacheKey(voiceId: string, text: string): string {
  const hash = createHash('sha256').update(`${voiceId}\n${text}`).digest('hex').slice(0, 32);
  return `tts-cache/${hash}.mp3`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Shift word-level timestamps in transcript.rawResponse and prepend VO words. */
function shiftRawResponse(
  raw: unknown,
  offsetMs: number,
  voiceoverText: string,
): Record<string, unknown> | null {
  const base = isRecord(raw) ? { ...raw } : {};
  const existing = Array.isArray(base.words) ? base.words : [];
  const shifted = existing
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const next = { ...item };
      if (typeof next.startMs === 'number') {
        next.startMs += offsetMs;
      }
      if (typeof next.endMs === 'number') {
        next.endMs += offsetMs;
      }
      return next;
    });

  const tokens = voiceoverText.trim().split(/\s+/).filter(Boolean);
  const voWords =
    tokens.length === 0
      ? []
      : tokens.map((word, index) => {
          const startMs = Math.round((index / tokens.length) * offsetMs);
          const endMs = Math.round(((index + 1) / tokens.length) * offsetMs);
          return { word, startMs, endMs, speaker: 'AI' };
        });

  return { ...base, words: [...voWords, ...shifted] };
}

/**
 * When `pre` pads the timeline, shift all timing metadata and insert an AI segment
 * so the editor transcript stays locked to the new video.
 */
async function alignTimelineAfterPreVoiceover(
  deps: WorkerDeps,
  recordingId: number,
  offsetMs: number,
  voiceoverText: string,
): Promise<void> {
  if (offsetMs <= 0) {
    return;
  }

  const segments = await deps.segments.listByRecordingId(recordingId);
  // Bump sequences high→low first so we can insert sequence 0 without collisions.
  const bySequenceDesc = [...segments].sort((a, b) => b.sequence - a.sequence);
  for (const segment of bySequenceDesc) {
    segment.sequence += 1;
    segment.startMs += offsetMs;
    segment.endMs += offsetMs;
  }
  if (bySequenceDesc.length > 0) {
    await deps.segments.save(bySequenceDesc);
  }

  await deps.segments.save(
    deps.segments.create({
      recordingId,
      sequence: 0,
      startMs: 0,
      endMs: offsetMs,
      speaker: 'AI',
      text: voiceoverText,
    }),
  );

  const transcript = await deps.transcripts.findByRecordingId(recordingId);
  if (transcript) {
    const existingText = (transcript.text ?? '').trim();
    transcript.text =
      existingText.length > 0 ? `${voiceoverText}\n\n${existingText}` : voiceoverText;
    if (typeof transcript.durationMs === 'number') {
      transcript.durationMs += offsetMs;
    }
    transcript.rawResponse = shiftRawResponse(transcript.rawResponse, offsetMs, voiceoverText);
    await deps.transcripts.save(transcript);
  }

  const hooks = await deps.hooks.listByRecordingId(recordingId);
  if (hooks.length > 0) {
    for (const hook of hooks) {
      hook.startMs += offsetMs;
      hook.endMs += offsetMs;
    }
    await deps.hooks.save(hooks);
  }

  const clips = await deps.clips.listByRecordingId(recordingId);
  if (clips.length > 0) {
    for (const clip of clips) {
      clip.startMs += offsetMs;
      clip.endMs += offsetMs;
    }
    await deps.clips.save(clips);
  }

  const recording = await deps.recordings.findOneBy({ id: recordingId });
  if (recording && typeof recording.durationMs === 'number') {
    recording.durationMs += offsetMs;
    await deps.recordings.save(recording);
  }

  // Best-effort: refresh vector payloads so Ask Moments / hooks stay time-aligned.
  try {
    const rows = await deps.segments.listByRecordingId(recordingId);
    const domainSegments: DomainSegment[] = rows.map((row) => {
      const segment: DomainSegment = {
        id: row.id,
        sequence: row.sequence,
        startMs: row.startMs,
        endMs: row.endMs,
        text: row.text,
      };
      if (row.speaker) {
        segment.speaker = row.speaker;
      }
      return segment;
    });
    const windows = buildSemanticWindows(domainSegments);
    await deps.transcriptVectorStore.deleteByRecordingId(recordingId);
    if (windows.length > 0) {
      const vectors = await deps.embeddings.embed(windows.map((window) => window.text));
      await deps.transcriptVectorStore.upsert(
        windows.map((window, index) => {
          const vector = vectors[index];
          if (!vector) {
            throw new Error(`Missing embedding for transcript window ${String(window.index)}`);
          }
          return {
            id: transcriptWindowPointId(recordingId, window.startMs, window.endMs),
            vector,
            recordingId,
            startMs: window.startMs,
            endMs: window.endMs,
          };
        }),
      );
    }

    if (hooks.length > 0) {
      const texts = hooks.map((hook) => {
        const text = [hook.hook, hook.contextText ?? '']
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .join(' ');
        return text.length > 0 ? text : hook.title.trim();
      });
      const vectors = await deps.embeddings.embed(texts);
      await deps.vectorStore.upsert(
        hooks.map((hook, index) => {
          const vector = vectors[index];
          if (!vector) {
            throw new Error(`Missing embedding for hook ${String(hook.id)}`);
          }
          return {
            id: String(hook.id),
            vector,
            recordingId: hook.recordingId,
            startMs: hook.startMs,
            endMs: hook.endMs,
            ...(hook.hookType ? { hookType: hook.hookType } : {}),
            ...(hook.score !== null ? { score: hook.score } : {}),
          };
        }),
      );
    }
  } catch {
    // Timeline alignment in MySQL already succeeded; search indexes can catch up later.
  }
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

export async function applyRecordingVoiceover(
  payload: ApplyRecordingVoiceoverPayload,
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
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

  const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-rec-vo-'));
  const videoPath = join(tmpDir, 'source.bin');
  const voicePath = join(tmpDir, 'voiceover.mp3');
  const outputPath = join(tmpDir, 'with-vo.mp4');

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }
    const text = payload.text.trim();
    if (text === '') {
      throw new Error('Voiceover text is empty');
    }

    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }

    await resolveSpeechAudio(deps, payload.voiceId, text, voicePath);
    const mixResult = await mixVoiceoverOntoVideo({
      videoPath,
      voiceoverPath: voicePath,
      outputPath,
      placement: payload.placement,
    });

    const body = await readFile(outputPath);
    const versionKey = `recording-${String(recording.id)}-vo-${String(Date.now())}.mp4`;
    const stored = await deps.storage.upload({
      key: versionKey,
      body,
      contentType: 'video/mp4',
    });

    recording.storageKey = stored.key;
    await deps.recordings.save(recording);

    if (payload.placement === 'pre' && mixResult.timelineOffsetMs > 0) {
      await alignTimelineAfterPreVoiceover(
        deps,
        payload.recordingId,
        mixResult.timelineOffsetMs,
        text,
      );
    }

    if (job) {
      job.status = JobStatus.Success;
      job.finishedAt = new Date();
      job.error = null;
      job.errorCode = null;
      job.metadata = {
        ...(job.metadata ?? {}),
        voiceId: payload.voiceId,
        placement: payload.placement,
        timelineOffsetMs: mixResult.timelineOffsetMs,
        voiceoverDurationMs: mixResult.voiceoverDurationMs,
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
      job.errorCode = 'APPLY_RECORDING_VOICEOVER_FAILED';
      await deps.jobs.save(job);
    }
    throw error instanceof Error ? error : new Error(message);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
