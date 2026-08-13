import type { Hook, TranscriptSegment } from '@mintreels/domain';
import { hookTypeSchema, type HookType } from '@mintreels/schema';
import { z } from 'zod';

export const HOOK_SCORE_DIMENSIONS = [
  'quality',
  'standalone',
  'curiosity',
  'emotional',
  'specificity',
  'shareability',
  'novelty',
] as const;

export type HookScoreDimension = (typeof HOOK_SCORE_DIMENSIONS)[number];

/** Per-dimension scores, already normalised to 0..1. */
export type HookDimensionScores = Record<HookScoreDimension, number>;

/** Weights applied to `HookDimensionScores` to produce the final 0..1 score. */
export type HookScoreWeights = Record<HookScoreDimension, number>;

/** A domain Hook plus the analysis fields the LLM discovery path fills in. */
export interface HookCandidate extends Hook {
  hook?: string;
  startSegmentId?: number;
  endSegmentId?: number;
  hookType?: HookType;
  contextText?: string;
  dimensions?: HookDimensionScores;
  provider?: string;
  model?: string;
  promptVersion?: string;
}

export interface HookCandidateContext {
  recordingId: number;
  segments: readonly TranscriptSegment[];
  weights: HookScoreWeights;
  maxCandidates: number;
  provider: string;
  model: string;
  promptVersion: string;
}

/** LLM scores each dimension 0-10; the product stores 0..1 everywhere. */
const LLM_SCORE_MAX = 10;

const llmScoreSchema = z.number();

const hooksResponseSchema = z.object({
  hooks: z.array(
    z.object({
      title: z.string().min(1),
      hook: z.string().min(1),
      reason: z.string().min(1),
      hookType: hookTypeSchema,
      startSegmentId: z.number().int(),
      endSegmentId: z.number().int(),
      scores: z.object({
        quality: llmScoreSchema,
        standalone: llmScoreSchema,
        curiosity: llmScoreSchema,
        emotional: llmScoreSchema,
        specificity: llmScoreSchema,
        shareability: llmScoreSchema,
        novelty: llmScoreSchema,
      }),
    }),
  ),
});

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function normaliseScores(scores: Record<HookScoreDimension, number>): HookDimensionScores {
  return {
    quality: clamp01(scores.quality / LLM_SCORE_MAX),
    standalone: clamp01(scores.standalone / LLM_SCORE_MAX),
    curiosity: clamp01(scores.curiosity / LLM_SCORE_MAX),
    emotional: clamp01(scores.emotional / LLM_SCORE_MAX),
    specificity: clamp01(scores.specificity / LLM_SCORE_MAX),
    shareability: clamp01(scores.shareability / LLM_SCORE_MAX),
    novelty: clamp01(scores.novelty / LLM_SCORE_MAX),
  };
}

/** Weighted sum, renormalised by the weight total so the result stays 0..1. */
export function weightedHookScore(
  dimensions: HookDimensionScores,
  weights: HookScoreWeights,
): number {
  let weighted = 0;
  let total = 0;
  for (const dimension of HOOK_SCORE_DIMENSIONS) {
    weighted += dimensions[dimension] * weights[dimension];
    total += weights[dimension];
  }
  return total > 0 ? clamp01(weighted / total) : 0;
}

/**
 * Turns the raw LLM response into scored candidates. Segment IDs are resolved against the
 * transcript to derive millisecond bounds — model-supplied timestamps are never trusted.
 */
export function mapHookCandidates(raw: unknown, ctx: HookCandidateContext): HookCandidate[] {
  const parsed = hooksResponseSchema.parse(raw);
  const ordered = [...ctx.segments].sort((a, b) => a.sequence - b.sequence);
  const positionById = new Map(ordered.map((segment, index) => [segment.id, index]));

  const seen = new Set<string>();
  const candidates: HookCandidate[] = [];
  for (const item of parsed.hooks) {
    const startPosition = positionById.get(item.startSegmentId);
    const endPosition = positionById.get(item.endSegmentId);
    if (startPosition === undefined || endPosition === undefined) {
      continue;
    }
    const slice = ordered.slice(
      Math.min(startPosition, endPosition),
      Math.max(startPosition, endPosition) + 1,
    );
    const first = slice[0];
    const last = slice.at(-1);
    if (!first || !last || last.endMs <= first.startMs) {
      continue;
    }
    const key = `${String(first.id)}:${String(last.id)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const dimensions = normaliseScores(item.scores);
    candidates.push({
      id: 0,
      recordingId: ctx.recordingId,
      title: item.title,
      hook: item.hook,
      rationale: item.reason,
      startMs: first.startMs,
      endMs: last.endMs,
      score: weightedHookScore(dimensions, ctx.weights),
      startSegmentId: first.id,
      endSegmentId: last.id,
      hookType: item.hookType,
      contextText: slice
        .map((segment) => segment.text.trim())
        .filter((text) => text.length > 0)
        .join(' '),
      dimensions,
      provider: ctx.provider,
      model: ctx.model,
      promptVersion: ctx.promptVersion,
    });
  }

  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.startMs - b.startMs);
  return candidates.slice(0, Math.max(0, ctx.maxCandidates));
}
