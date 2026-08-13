import { z } from 'zod';
import { idSchema } from './common';
import { EmbeddingStatus, HookStatus, HookType } from './enums';

export const hookTypeSchema = z.enum([
  HookType.Story,
  HookType.Lesson,
  HookType.Controversy,
  HookType.Surprise,
  HookType.Failure,
  HookType.Success,
  HookType.Advice,
  HookType.Emotion,
  HookType.Data,
  HookType.Quote,
]);

export const hookStatusSchema = z.enum([
  HookStatus.Candidate,
  HookStatus.Selected,
  HookStatus.Rejected,
]);

export const embeddingStatusSchema = z.enum([
  EmbeddingStatus.Pending,
  EmbeddingStatus.Processing,
  EmbeddingStatus.Completed,
  EmbeddingStatus.Failed,
]);

/**
 * hooks — docs/architecture.md §22 (AI-suggested clip windows).
 * Score fields are 0..1. LLM 0–10 scores are divided by 10 before persist.
 */
export const hookRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  title: z.string().min(1),
  hook: z.string().min(1),
  reason: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  score: z.number().min(0).max(1).nullable(),
  startSegmentId: idSchema.nullable(),
  endSegmentId: idSchema.nullable(),
  hookType: hookTypeSchema.nullable(),
  contextText: z.string().nullable(),
  qualityScore: z.number().min(0).max(1).nullable(),
  standaloneScore: z.number().min(0).max(1).nullable(),
  curiosityScore: z.number().min(0).max(1).nullable(),
  emotionalScore: z.number().min(0).max(1).nullable(),
  specificityScore: z.number().min(0).max(1).nullable(),
  shareabilityScore: z.number().min(0).max(1).nullable(),
  noveltyScore: z.number().min(0).max(1).nullable(),
  status: hookStatusSchema,
  embeddingStatus: embeddingStatusSchema,
  clipStartMs: z.number().int().nonnegative().nullable(),
  clipEndMs: z.number().int().nonnegative().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const hookInsertSchema = hookRowSchema.partial({
  id: true,
  score: true,
  startSegmentId: true,
  endSegmentId: true,
  hookType: true,
  contextText: true,
  qualityScore: true,
  standaloneScore: true,
  curiosityScore: true,
  emotionalScore: true,
  specificityScore: true,
  shareabilityScore: true,
  noveltyScore: true,
  status: true,
  embeddingStatus: true,
  clipStartMs: true,
  clipEndMs: true,
  provider: true,
  model: true,
  promptVersion: true,
  createdAt: true,
});

export type HookRow = z.infer<typeof hookRowSchema>;
export type HookInsert = z.infer<typeof hookInsertSchema>;
