import type { Job } from '@mintreels/domain';

export interface QueueProvider {
  enqueue<T>(job: Job<T>): Promise<void>;
}
