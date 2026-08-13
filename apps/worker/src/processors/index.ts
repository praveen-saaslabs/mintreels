import { EnvKey } from '@mintreels/schema';
import { startWorker } from '@mintreels/queue';
import { ingestVideo, type IngestVideoPayload } from '../jobs/ingest-video';
import { requireRedisUrl } from '../pipeline/config';
import type { WorkerDeps } from '../pipeline/deps';

function parsePayload(data: unknown): IngestVideoPayload {
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

export function createProcessors(deps: WorkerDeps): { close: () => Promise<void> } {
  const redisUrl = requireRedisUrl();
  const concurrency = Number(process.env[EnvKey.WorkerConcurrency]) || 1;
  return startWorker({
    queueName: 'mintreels',
    redisUrl,
    concurrency,
    handlers: {
      'ingest-video': async (data) => {
        await ingestVideo(parsePayload(data), deps);
      },
    },
  });
}
