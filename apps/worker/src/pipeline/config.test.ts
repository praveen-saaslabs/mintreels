import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EnvKey } from '@mintreels/schema';
import { loadHookConfig } from './config';

const HOOK_ENV_KEYS = [
  EnvKey.HookSimilarityThreshold,
  EnvKey.HookMaxCandidates,
  EnvKey.HookFinalCount,
  EnvKey.ClipPrerollMs,
  EnvKey.ClipPostrollMs,
  'HOOK_WEIGHT_QUALITY',
  'HOOK_WEIGHT_STANDALONE',
  'HOOK_WEIGHT_CURIOSITY',
  'HOOK_WEIGHT_EMOTIONAL',
  'HOOK_WEIGHT_SPECIFICITY',
  'HOOK_WEIGHT_SHAREABILITY',
  'HOOK_WEIGHT_NOVELTY',
  'HOOK_WEIGHT_CONTROVERSY',
  'HOOK_WEIGHT_HEADLINE',
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(HOOK_ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of HOOK_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearHookEnv(): void {
  for (const key of HOOK_ENV_KEYS) {
    delete process.env[key];
  }
}

test('loadHookConfig uses documented defaults', async () => {
  const snapshot = snapshotEnv();
  clearHookEnv();
  try {
    const config = await loadHookConfig();
    assert.equal(config.similarityThreshold, 0.85);
    assert.equal(config.maxCandidates, 50);
    assert.equal(config.finalCount, 10);
    assert.equal(config.preRollMs, 3000);
    assert.equal(config.postRollMs, 5000);
    assert.deepEqual(config.weights, {
      quality: 0.22,
      standalone: 0.15,
      curiosity: 0.12,
      emotional: 0.08,
      specificity: 0.08,
      shareability: 0.08,
      novelty: 0.04,
      controversy: 0.12,
      headline: 0.11,
    });
    const weightSum = Object.values(config.weights).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(weightSum - 1) < 1e-9);
  } finally {
    restoreEnv(snapshot);
  }
});

test('loadHookConfig parses overrides', async () => {
  const snapshot = snapshotEnv();
  try {
    process.env[EnvKey.HookSimilarityThreshold] = '0.9';
    process.env[EnvKey.HookMaxCandidates] = '20';
    process.env[EnvKey.HookFinalCount] = '5';
    process.env[EnvKey.ClipPrerollMs] = '1000';
    process.env[EnvKey.ClipPostrollMs] = '2000';
    process.env['HOOK_WEIGHT_QUALITY'] = '1';
    process.env['HOOK_WEIGHT_STANDALONE'] = '0';
    process.env['HOOK_WEIGHT_CURIOSITY'] = '0';
    process.env['HOOK_WEIGHT_EMOTIONAL'] = '0';
    process.env['HOOK_WEIGHT_SPECIFICITY'] = '0';
    process.env['HOOK_WEIGHT_SHAREABILITY'] = '0';
    process.env['HOOK_WEIGHT_NOVELTY'] = '0';
    process.env['HOOK_WEIGHT_CONTROVERSY'] = '0';
    process.env['HOOK_WEIGHT_HEADLINE'] = '0';
    const config = await loadHookConfig();
    assert.equal(config.similarityThreshold, 0.9);
    assert.equal(config.maxCandidates, 20);
    assert.equal(config.finalCount, 5);
    assert.equal(config.preRollMs, 1000);
    assert.equal(config.postRollMs, 2000);
    assert.equal(config.weights.quality, 1);
    assert.equal(config.weights.novelty, 0);
    assert.equal(config.weights.controversy, 0);
    assert.equal(config.weights.headline, 0);
  } finally {
    restoreEnv(snapshot);
  }
});

test('loadHookConfig ignores invalid values', async () => {
  const snapshot = snapshotEnv();
  try {
    process.env[EnvKey.HookSimilarityThreshold] = 'nope';
    process.env[EnvKey.HookMaxCandidates] = '-3';
    process.env['HOOK_WEIGHT_QUALITY'] = 'abc';
    const config = await loadHookConfig();
    assert.equal(config.similarityThreshold, 0.85);
    assert.equal(config.maxCandidates, 50);
    assert.equal(config.weights.quality, 0.22);
  } finally {
    restoreEnv(snapshot);
  }
});
