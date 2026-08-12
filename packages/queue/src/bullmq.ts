import { Queue } from 'bullmq';
import type { Job } from '@mintreels/domain';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from './provider';

function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    throw new Error('REDIS_URL is required');
  }
  return url;
}

const DEFAULT_QUEUE_NAME = 'mintreels';

export class BullMQQueueProvider implements QueueProvider {
  private readonly queue: Queue;

  constructor(queueName = DEFAULT_QUEUE_NAME, redisUrl = requireRedisUrl()) {
    this.queue = new Queue(queueName, {
      connection: { url: redisUrl },
    });
  }

  async enqueue<T>(job: Job<T>): Promise<void> {
    const name = job.name.trim();
    if (name === '') {
      throw new Error('Job name is required');
    }

    await this.queue.add(name, job.payload, {
      ...(job.id ? { jobId: job.id } : {}),
      attempts: job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
