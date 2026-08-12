import type { JobStatus } from '@mintreels/domain';

export interface GenerateHooksPayload {
  recordingId: string;
}

export async function generateHooks(_payload: GenerateHooksPayload): Promise<JobStatus> {
  // TODO: LLMProvider.generateHooks → persist hooks
  throw new Error('generateHooks is not implemented');
}
