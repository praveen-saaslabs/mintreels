import type { JobStatus } from '@mintreels/domain';
import type { WorkerDeps } from '../pipeline/deps';
import { executeHookPipeline } from '../pipeline/orchestrator';

export interface GenerateHooksPayload {
  recordingId: number;
  jobId: number;
}

export async function generateHooks(
  payload: GenerateHooksPayload,
  deps: WorkerDeps,
): Promise<JobStatus> {
  return executeHookPipeline({ recordingId: payload.recordingId, jobId: payload.jobId }, deps);
}
