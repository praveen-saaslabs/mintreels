import type { JobStatus } from '@mintreels/domain';

export interface IngestVideoPayload {
  recordingId: string;
  storageKey: string;
}

export async function ingestVideo(_payload: IngestVideoPayload): Promise<JobStatus> {
  // TODO: download video, extract audio, enqueue transcribe
  throw new Error('ingestVideo is not implemented');
}
