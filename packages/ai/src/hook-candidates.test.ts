import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TranscriptSegment } from '@mintreels/domain';
import { HookType } from '@mintreels/schema';
import { mapHookCandidates, weightedHookScore, type HookScoreWeights } from './hook-candidates';
import { buildSemanticWindows } from './semantic-windows';

const WEIGHTS: HookScoreWeights = {
  quality: 0.3,
  standalone: 0.2,
  curiosity: 0.15,
  emotional: 0.1,
  specificity: 0.1,
  shareability: 0.1,
  novelty: 0.05,
};

/** 12 segments of 5s each => 60s of transcript, ids 101..112. */
function segments(): TranscriptSegment[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: 101 + index,
    sequence: index,
    startMs: index * 5000,
    endMs: (index + 1) * 5000,
    text: `line ${String(index + 1)}`,
  }));
}

function scores(value: number): HookScoreWeights {
  return {
    quality: value,
    standalone: value,
    curiosity: value,
    emotional: value,
    specificity: value,
    shareability: value,
    novelty: value,
  };
}

function assertClose(actual: number | undefined, expected: number): void {
  assert.ok(
    actual !== undefined && Math.abs(actual - expected) < 1e-9,
    `expected ${String(actual)} to be ${String(expected)}`,
  );
}

test('windows are segment-aligned, 20-60s, and deterministic', () => {
  const windows = buildSemanticWindows(segments());
  assert.deepEqual(
    windows.map((window) => [window.startSegmentId, window.endSegmentId, window.startMs, window.endMs]),
    [
      [101, 104, 0, 20_000],
      [105, 108, 20_000, 40_000],
      [109, 112, 40_000, 60_000],
    ],
  );
  for (const window of windows) {
    const duration = window.endMs - window.startMs;
    assert.ok(duration >= 20_000 && duration <= 60_000, `window duration ${String(duration)}`);
  }
  assert.deepEqual(buildSemanticWindows(segments()), windows);
  assert.deepEqual(buildSemanticWindows([...segments()].reverse()), windows);
});

test('a short tail merges into the previous window instead of standing alone', () => {
  const windows = buildSemanticWindows(segments().slice(0, 5));
  assert.equal(windows.length, 1);
  assert.equal(windows[0]?.startSegmentId, 101);
  assert.equal(windows[0]?.endSegmentId, 105);
  assert.equal(windows[0]?.endMs, 25_000);
});

test('segment ids resolve to transcript milliseconds and context text', () => {
  const candidates = mapHookCandidates(
    {
      hooks: [
        {
          title: 'Founder mistake',
          hook: 'The biggest mistake founders make',
          reason: 'Opens a loop and pays it off',
          hookType: HookType.Lesson,
          startSegmentId: 103,
          endSegmentId: 107,
          scores: scores(8),
        },
      ],
    },
    {
      recordingId: 7,
      segments: segments(),
      weights: WEIGHTS,
      maxCandidates: 50,
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptVersion: 'hooks-v1',
    },
  );

  assert.equal(candidates.length, 1);
  const candidate = candidates[0];
  assert.equal(candidate?.startMs, 10_000);
  assert.equal(candidate?.endMs, 35_000);
  assert.equal(candidate?.startSegmentId, 103);
  assert.equal(candidate?.endSegmentId, 107);
  assert.equal(candidate?.contextText, 'line 3 line 4 line 5 line 6 line 7');
  assert.equal(candidate?.hookType, HookType.Lesson);
  assert.equal(candidate?.promptVersion, 'hooks-v1');
  assert.equal(candidate?.dimensions?.quality, 0.8);
  assertClose(candidate?.score, 0.8);
});

test('weighted score follows the configured weights and stays 0..1', () => {
  const dimensions = {
    quality: 1,
    standalone: 0,
    curiosity: 0,
    emotional: 0,
    specificity: 0,
    shareability: 0,
    novelty: 0,
  };
  assertClose(weightedHookScore(dimensions, WEIGHTS), 0.3);
  assertClose(weightedHookScore(dimensions, { ...WEIGHTS, quality: 1 }), 1 / 1.7);
  assert.equal(weightedHookScore(dimensions, scores(0)), 0);
});

test('unknown segment ids, zero-length spans, and duplicates are dropped; ranking caps the list', () => {
  const candidates = mapHookCandidates(
    {
      hooks: [
        {
          title: 'Ghost',
          hook: 'Never spoken',
          reason: 'Model invented a segment id',
          hookType: HookType.Quote,
          startSegmentId: 999,
          endSegmentId: 1000,
          scores: scores(10),
        },
        {
          title: 'Weak',
          hook: 'Weak line',
          reason: 'Low scores',
          hookType: HookType.Advice,
          startSegmentId: 101,
          endSegmentId: 103,
          scores: scores(2),
        },
        {
          title: 'Strong',
          hook: 'Strong line',
          reason: 'High scores',
          hookType: HookType.Story,
          startSegmentId: 105,
          endSegmentId: 108,
          scores: scores(9),
        },
        {
          title: 'Duplicate span',
          hook: 'Same window again',
          reason: 'Repeated range',
          hookType: HookType.Story,
          startSegmentId: 105,
          endSegmentId: 108,
          scores: scores(10),
        },
      ],
    },
    {
      recordingId: 7,
      segments: segments(),
      weights: WEIGHTS,
      maxCandidates: 1,
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptVersion: 'hooks-v1',
    },
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.title, 'Strong');
  assertClose(candidates[0]?.score, 0.9);
});
