import type { Job } from '@mintreels/domain';

export interface QueueProvider {
  enqueue<T>(job: Job<T>): Promise<void>;
  /** Best-effort remove by BullMQ job id. Missing jobs are ignored. */
  remove(jobId: string): Promise<void>;
}
