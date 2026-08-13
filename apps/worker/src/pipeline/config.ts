import type { HookScoreWeights } from '@mintreels/ai';
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

function parseNonNegative(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
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

export type { HookScoreWeights };

export type HookConfig = {
  similarityThreshold: number;
  maxCandidates: number;
  finalCount: number;
  preRollMs: number;
  postRollMs: number;
  weights: HookScoreWeights;
};

export function loadHookConfig(): HookConfig {
  return {
    similarityThreshold: parsePositive(process.env[EnvKey.HookSimilarityThreshold], 0.85),
    maxCandidates: Math.trunc(parsePositive(process.env[EnvKey.HookMaxCandidates], 50)),
    finalCount: Math.trunc(parsePositive(process.env[EnvKey.HookFinalCount], 10)),
    preRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPrerollMs], 3000)),
    postRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPostrollMs], 5000)),
    weights: {
      quality: parseNonNegative(process.env[EnvKey.HookWeightQuality], 0.3),
      standalone: parseNonNegative(process.env[EnvKey.HookWeightStandalone], 0.2),
      curiosity: parseNonNegative(process.env[EnvKey.HookWeightCuriosity], 0.15),
      emotional: parseNonNegative(process.env[EnvKey.HookWeightEmotional], 0.1),
      specificity: parseNonNegative(process.env[EnvKey.HookWeightSpecificity], 0.1),
      shareability: parseNonNegative(process.env[EnvKey.HookWeightShareability], 0.1),
      novelty: parseNonNegative(process.env[EnvKey.HookWeightNovelty], 0.05),
    },
  };
}

export function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    throw new Error('REDIS_URL is required');
  }
  return url;
}
