import { EnvKey } from '@mintreels/schema';

function parsePositive(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function loadJobConfig(): {
  maxAttempts: number;
  retryBaseDelayMs: number;
  staleTimeoutMs: number;
} {
  return {
    maxAttempts: parsePositive(process.env[EnvKey.JobMaxAttempts], 4),
    retryBaseDelayMs: parsePositive(process.env[EnvKey.JobRetryBaseDelayMs], 5000),
    staleTimeoutMs: parsePositive(process.env[EnvKey.JobStepStaleTimeoutMs], 1_800_000),
  };
}

export function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    throw new Error('REDIS_URL is required');
  }
  return url;
}
