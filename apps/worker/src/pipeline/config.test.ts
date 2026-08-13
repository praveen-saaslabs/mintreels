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
  EnvKey.HookWeightQuality,
  EnvKey.HookWeightStandalone,
  EnvKey.HookWeightCuriosity,
  EnvKey.HookWeightEmotional,
  EnvKey.HookWeightSpecificity,
  EnvKey.HookWeightShareability,
  EnvKey.HookWeightNovelty,
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

test('loadHookConfig uses documented defaults', () => {
  const snapshot = snapshotEnv();
  clearHookEnv();
  try {
    const config = loadHookConfig();
    assert.equal(config.similarityThreshold, 0.85);
    assert.equal(config.maxCandidates, 50);
    assert.equal(config.finalCount, 10);
    assert.equal(config.preRollMs, 3000);
    assert.equal(config.postRollMs, 5000);
    assert.deepEqual(config.weights, {
      quality: 0.3,
      standalone: 0.2,
      curiosity: 0.15,
      emotional: 0.1,
      specificity: 0.1,
      shareability: 0.1,
      novelty: 0.05,
    });
    const weightSum = Object.values(config.weights).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(weightSum - 1) < 1e-9);
  } finally {
    restoreEnv(snapshot);
  }
});

test('loadHookConfig parses overrides', () => {
  const snapshot = snapshotEnv();
  try {
    process.env[EnvKey.HookSimilarityThreshold] = '0.9';
    process.env[EnvKey.HookMaxCandidates] = '20';
    process.env[EnvKey.HookFinalCount] = '5';
    process.env[EnvKey.ClipPrerollMs] = '1000';
    process.env[EnvKey.ClipPostrollMs] = '2000';
    process.env[EnvKey.HookWeightQuality] = '1';
    process.env[EnvKey.HookWeightStandalone] = '0';
    process.env[EnvKey.HookWeightCuriosity] = '0';
    process.env[EnvKey.HookWeightEmotional] = '0';
    process.env[EnvKey.HookWeightSpecificity] = '0';
    process.env[EnvKey.HookWeightShareability] = '0';
    process.env[EnvKey.HookWeightNovelty] = '0';
    const config = loadHookConfig();
    assert.equal(config.similarityThreshold, 0.9);
    assert.equal(config.maxCandidates, 20);
    assert.equal(config.finalCount, 5);
    assert.equal(config.preRollMs, 1000);
    assert.equal(config.postRollMs, 2000);
    assert.equal(config.weights.quality, 1);
    assert.equal(config.weights.novelty, 0);
  } finally {
    restoreEnv(snapshot);
  }
});

test('loadHookConfig ignores invalid values', () => {
  const snapshot = snapshotEnv();
  try {
    process.env[EnvKey.HookSimilarityThreshold] = 'nope';
    process.env[EnvKey.HookMaxCandidates] = '-3';
    process.env[EnvKey.HookWeightQuality] = 'abc';
    const config = loadHookConfig();
    assert.equal(config.similarityThreshold, 0.85);
    assert.equal(config.maxCandidates, 50);
    assert.equal(config.weights.quality, 0.3);
  } finally {
    restoreEnv(snapshot);
  }
});
