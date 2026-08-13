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

export type MomentSearchConfig = {
  limit: number;
  minimumSimilarity: number;
  preRollMs: number;
  postRollMs: number;
};

export function loadMomentSearchConfig(): MomentSearchConfig {
  return {
    limit: Math.trunc(parsePositive(process.env[EnvKey.MomentSearchLimit], 8)),
    minimumSimilarity: parsePositive(process.env[EnvKey.MomentSearchMinSimilarity], 0.35),
    preRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPrerollMs], 3000)),
    postRollMs: Math.trunc(parsePositive(process.env[EnvKey.ClipPostrollMs], 5000)),
  };
}
