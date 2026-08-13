import type { JobStatus } from '@mintreels/domain';
import type { WorkerDeps } from '../pipeline/deps';
import { executePipeline } from '../pipeline/orchestrator';

export interface IngestVideoPayload {
  recordingId: number;
  jobId?: number;
  storageKey?: string;
}

export async function ingestVideo(payload: IngestVideoPayload, deps: WorkerDeps): Promise<JobStatus> {
  return executePipeline(
    payload.jobId !== undefined
      ? { recordingId: payload.recordingId, jobId: payload.jobId }
      : { recordingId: payload.recordingId },
    deps,
  );
}
