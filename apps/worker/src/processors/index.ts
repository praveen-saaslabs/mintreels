import { EnvKey } from '@mintreels/schema';
import { startWorker } from '@mintreels/queue';
import { applyOverdub, type ApplyOverdubPayload } from '../jobs/apply-overdub';
import {
  applyRecordingVoiceover,
  type ApplyRecordingVoiceoverPayload,
} from '../jobs/apply-recording-voiceover';
import { generateHooks, type GenerateHooksPayload } from '../jobs/generate-hooks';
import { ingestVideo, type IngestVideoPayload } from '../jobs/ingest-video';
import { renderClip, type RenderClipPayload } from '../jobs/render-clip';
import { requireRedisUrl } from '../pipeline/config';
import type { WorkerDeps } from '../pipeline/deps';

function parseIngestPayload(data: unknown): IngestVideoPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('ingest-video payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.recordingId !== 'number') {
    throw new Error('ingest-video payload.recordingId is required');
  }
  const payload: IngestVideoPayload = { recordingId: rec.recordingId };
  if (typeof rec.jobId === 'number') {
    payload.jobId = rec.jobId;
  }
  if (typeof rec.storageKey === 'string') {
    payload.storageKey = rec.storageKey;
  }
  return payload;
}

function parseRenderClipPayload(data: unknown): RenderClipPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('render-clip payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.clipId !== 'number') {
    throw new Error('render-clip payload.clipId is required');
  }
  if (typeof rec.recordingId !== 'number') {
    throw new Error('render-clip payload.recordingId is required');
  }
  if (typeof rec.startMs !== 'number' || typeof rec.endMs !== 'number') {
    throw new Error('render-clip payload.startMs and endMs are required');
  }
  const payload: RenderClipPayload = {
    clipId: rec.clipId,
    recordingId: rec.recordingId,
    startMs: rec.startMs,
    endMs: rec.endMs,
  };
  if (typeof rec.jobId === 'number') {
    payload.jobId = rec.jobId;
  }
  return payload;
}

function parseGenerateHooksPayload(data: unknown): GenerateHooksPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('generate-hooks payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.recordingId !== 'number' || typeof rec.jobId !== 'number') {
    throw new Error('generate-hooks payload.recordingId and payload.jobId are required');
  }
  return { recordingId: rec.recordingId, jobId: rec.jobId };
}

function parseApplyOverdubPayload(data: unknown): ApplyOverdubPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('apply-overdub payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.recordingId !== 'number') {
    throw new Error('apply-overdub payload.recordingId is required');
  }
  if (typeof rec.segmentId !== 'number') {
    throw new Error('apply-overdub payload.segmentId is required');
  }
  if (typeof rec.jobId !== 'number') {
    throw new Error('apply-overdub payload.jobId is required');
  }
  if (typeof rec.voiceId !== 'string' || rec.voiceId.trim() === '') {
    throw new Error('apply-overdub payload.voiceId is required');
  }
  if (typeof rec.text !== 'string') {
    throw new Error('apply-overdub payload.text is required');
  }
  if (typeof rec.startMs !== 'number' || typeof rec.endMs !== 'number') {
    throw new Error('apply-overdub payload.startMs and endMs are required');
  }
  return {
    recordingId: rec.recordingId,
    segmentId: rec.segmentId,
    jobId: rec.jobId,
    voiceId: rec.voiceId.trim(),
    text: rec.text,
    startMs: rec.startMs,
    endMs: rec.endMs,
  };
}

function parseApplyRecordingVoiceoverPayload(data: unknown): ApplyRecordingVoiceoverPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('apply-recording-voiceover payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.recordingId !== 'number') {
    throw new Error('apply-recording-voiceover payload.recordingId is required');
  }
  if (typeof rec.jobId !== 'number') {
    throw new Error('apply-recording-voiceover payload.jobId is required');
  }
  if (typeof rec.voiceId !== 'string' || rec.voiceId.trim() === '') {
    throw new Error('apply-recording-voiceover payload.voiceId is required');
  }
  if (typeof rec.text !== 'string' || rec.text.trim() === '') {
    throw new Error('apply-recording-voiceover payload.text is required');
  }
  if (rec.placement !== 'pre' && rec.placement !== 'duck') {
    throw new Error('apply-recording-voiceover payload.placement must be pre or duck');
  }
  return {
    recordingId: rec.recordingId,
    jobId: rec.jobId,
    voiceId: rec.voiceId.trim(),
    placement: rec.placement,
    text: rec.text,
  };
}

export function createProcessors(deps: WorkerDeps): { close: () => Promise<void> } {
  const redisUrl = requireRedisUrl();
  const concurrency = Number(process.env[EnvKey.WorkerConcurrency]) || 1;
  return startWorker({
    queueName: 'mintreels',
    redisUrl,
    concurrency,
    handlers: {
      'ingest-video': async (data) => {
        await ingestVideo(parseIngestPayload(data), deps);
      },
      'render-clip': async (data) => {
        await renderClip(parseRenderClipPayload(data), deps);
      },
      'generate-hooks': async (data) => {
        await generateHooks(parseGenerateHooksPayload(data), deps);
      },
      'apply-overdub': async (data) => {
        await applyOverdub(parseApplyOverdubPayload(data), deps);
      },
      'apply-recording-voiceover': async (data) => {
        await applyRecordingVoiceover(parseApplyRecordingVoiceoverPayload(data), deps);
      },
    },
  });
}
