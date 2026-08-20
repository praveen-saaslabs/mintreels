import type { HookScoreWeights } from '@mintreels/ai';
import type { SystemSettingsRepository } from '@mintreels/db';
import { EnvKey, SettingKey, DEFAULT_HOOK_WEIGHTS, hookWeightsSchema } from '@mintreels/schema';

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

/**
 * Load hook weights from database with environment variable fallback.
 */
async function loadHookWeights(
  systemSettings?: SystemSettingsRepository,
): Promise<HookScoreWeights> {
  // Try database first if systemSettings repository is provided
  if (systemSettings) {
    try {
      const setting = await systemSettings.findByKey(SettingKey.HookWeights);
      if (setting?.settingValue) {
        // Validate the stored weights
        const result = hookWeightsSchema.safeParse(setting.settingValue);
        if (result.success) {
          return result.data;
        }
      }
    } catch (error) {
      // Fall through to environment/defaults on database error
    }
  }

  // Fallback to environment variables with defaults
  const envWeights = {
    quality: parseNonNegative(process.env['HOOK_WEIGHT_QUALITY'], DEFAULT_HOOK_WEIGHTS.quality),
    standalone: parseNonNegative(
      process.env['HOOK_WEIGHT_STANDALONE'],
      DEFAULT_HOOK_WEIGHTS.standalone,
    ),
    curiosity: parseNonNegative(
      process.env['HOOK_WEIGHT_CURIOSITY'],
      DEFAULT_HOOK_WEIGHTS.curiosity,
    ),
    emotional: parseNonNegative(
      process.env['HOOK_WEIGHT_EMOTIONAL'],
      DEFAULT_HOOK_WEIGHTS.emotional,
    ),
    specificity: parseNonNegative(
      process.env['HOOK_WEIGHT_SPECIFICITY'],
      DEFAULT_HOOK_WEIGHTS.specificity,
    ),
    shareability: parseNonNegative(
      process.env['HOOK_WEIGHT_SHAREABILITY'],
      DEFAULT_HOOK_WEIGHTS.shareability,
    ),
    novelty: parseNonNegative(process.env['HOOK_WEIGHT_NOVELTY'], DEFAULT_HOOK_WEIGHTS.novelty),
    controversy: parseNonNegative(
      process.env['HOOK_WEIGHT_CONTROVERSY'],
      DEFAULT_HOOK_WEIGHTS.controversy,
    ),
    headline: parseNonNegative(process.env['HOOK_WEIGHT_HEADLINE'], DEFAULT_HOOK_WEIGHTS.headline),
  };

  // Validate the environment-based weights
  const result = hookWeightsSchema.safeParse(envWeights);
  if (result.success) {
    return result.data;
  }

  // If environment weights are invalid, return hardcoded defaults
  return DEFAULT_HOOK_WEIGHTS;
}

export async function loadHookConfig(
  systemSettings?: SystemSettingsRepository,
): Promise<HookConfig> {
  const weights = await loadHookWeights(systemSettings);

  return {
    similarityThreshold: parsePositive(process.env[EnvKey.HookSimilarityThreshold], 0.85),
    maxCandidates: Math.trunc(parsePositive(process.env[EnvKey.HookMaxCandidates], 50)),
    finalCount: Math.trunc(parsePositive(process.env[EnvKey.HookFinalCount], 10)),
    preRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPrerollMs], 3000)),
    postRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPostrollMs], 5000)),
    weights,
  };
}

export function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    throw new Error('REDIS_URL is required');
  }
  return url;
}
