import type { JobStatus } from '@mintreels/domain';

export interface SummarizePayload {
  recordingId: number;
}

export async function summarize(_payload: SummarizePayload): Promise<JobStatus> {
  // TODO: LLMProvider.summarize → persist summary
  throw new Error('summarize is not implemented');
}
