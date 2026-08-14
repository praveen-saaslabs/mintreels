import { EnvKey } from '@mintreels/schema';
import { startWorker } from '@mintreels/queue';
import { applyOverdub, type ApplyOverdubPayload } from '../jobs/apply-overdub';
import {
  applyRecordingVoiceover,
  type ApplyRecordingVoiceoverPayload,
} from '../jobs/apply-recording-voiceover';
import { exportRecording, type ExportRecordingPayload } from '../jobs/export-recording';
import { generateHooks, type GenerateHooksPayload } from '../jobs/generate-hooks';
import { ingestVideo, type IngestVideoPayload } from '../jobs/ingest-video';
import { renderClip, type RenderClipPayload } from '../jobs/render-clip';
import { requireRedisUrl } from '../pipeline/config';
import type { WorkerDeps } from '../pipeline/deps';
import { logPipeline, logPipelineError } from '../pipeline/log';

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
  if (
    rec.aspectRatio === '9:16' ||
    rec.aspectRatio === '1:1' ||
    rec.aspectRatio === '16:9'
  ) {
    payload.aspectRatio = rec.aspectRatio;
  }
  if (rec.fitMode === 'fit' || rec.fitMode === 'fill') {
    payload.fitMode = rec.fitMode;
  }
  if (typeof rec.burnSubtitles === 'boolean') {
    payload.burnSubtitles = rec.burnSubtitles;
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

function parseExportRecordingPayload(data: unknown): ExportRecordingPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('export-recording payload is required');
  }
  const rec = data as Record<string, unknown>;
  if (typeof rec.recordingId !== 'number') {
    throw new Error('export-recording payload.recordingId is required');
  }
  if (typeof rec.jobId !== 'number') {
    throw new Error('export-recording payload.jobId is required');
  }
  const payload: ExportRecordingPayload = {
    recordingId: rec.recordingId,
    jobId: rec.jobId,
  };
  if (
    rec.aspectRatio === '9:16' ||
    rec.aspectRatio === '1:1' ||
    rec.aspectRatio === '16:9'
  ) {
    payload.aspectRatio = rec.aspectRatio;
  }
  if (rec.fitMode === 'fit' || rec.fitMode === 'fill') {
    payload.fitMode = rec.fitMode;
  }
  if (typeof rec.burnSubtitles === 'boolean') {
    payload.burnSubtitles = rec.burnSubtitles;
  }
  return payload;
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

function failMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return 'handler failed';
}

async function runLoggedHandler(params: {
  job: string;
  recordingId: number;
  jobId?: number;
  clipId?: number;
  run: () => Promise<void>;
}): Promise<void> {
  const base = {
    job: params.job,
    recordingId: params.recordingId,
    step: 'handler',
    ...(params.jobId !== undefined ? { jobId: params.jobId } : {}),
    ...(params.clipId !== undefined ? { clipId: params.clipId } : {}),
  };
  logPipeline({ ...base, message: 'handler_start' });
  try {
    await params.run();
    logPipeline({ ...base, message: 'handler_done' });
  } catch (error: unknown) {
    logPipelineError({ ...base, message: failMessage(error) });
    throw error;
  }
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
        const payload = parseIngestPayload(data);
        await runLoggedHandler({
          job: 'ingest-video',
          recordingId: payload.recordingId,
          ...(payload.jobId !== undefined ? { jobId: payload.jobId } : {}),
          run: async () => {
            await ingestVideo(payload, deps);
          },
        });
      },
      'render-clip': async (data) => {
        const payload = parseRenderClipPayload(data);
        await runLoggedHandler({
          job: 'render-clip',
          recordingId: payload.recordingId,
          clipId: payload.clipId,
          ...(payload.jobId !== undefined ? { jobId: payload.jobId } : {}),
          run: async () => {
            await renderClip(payload, deps);
          },
        });
      },
      'export-recording': async (data) => {
        const payload = parseExportRecordingPayload(data);
        await runLoggedHandler({
          job: 'export-recording',
          recordingId: payload.recordingId,
          jobId: payload.jobId,
          run: async () => {
            await exportRecording(payload, deps);
          },
        });
      },
      'generate-hooks': async (data) => {
        const payload = parseGenerateHooksPayload(data);
        await runLoggedHandler({
          job: 'generate-hooks',
          recordingId: payload.recordingId,
          jobId: payload.jobId,
          run: async () => {
            await generateHooks(payload, deps);
          },
        });
      },
      'apply-overdub': async (data) => {
        const payload = parseApplyOverdubPayload(data);
        await runLoggedHandler({
          job: 'apply-overdub',
          recordingId: payload.recordingId,
          jobId: payload.jobId,
          run: async () => {
            await applyOverdub(payload, deps);
          },
        });
      },
      'apply-recording-voiceover': async (data) => {
        const payload = parseApplyRecordingVoiceoverPayload(data);
        await runLoggedHandler({
          job: 'apply-recording-voiceover',
          recordingId: payload.recordingId,
          jobId: payload.jobId,
          run: async () => {
            await applyRecordingVoiceover(payload, deps);
          },
        });
      },
    },
  });
}
