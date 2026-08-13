import { EnvKey } from '@mintreels/schema';
import { startWorker } from '@mintreels/queue';
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
    },
  });
}
