import type { JobStatus } from '@mintreels/domain';

export interface TranscribePayload {
  recordingId: number;
  storageKey: string;
}

export async function transcribe(_payload: TranscribePayload): Promise<JobStatus> {
  // TODO: SpeechProvider.transcribe → persist timestamped transcript → enqueue summarize
  throw new Error('transcribe is not implemented');
}
