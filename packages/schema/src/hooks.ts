import { z } from 'zod';
import { idSchema } from './common';

/**
 * hooks — docs/architecture.md §22 (AI-suggested clip windows).
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
  createdAt: z.coerce.date(),
});

export const hookInsertSchema = hookRowSchema.partial({
  id: true,
  score: true,
  createdAt: true,
});

export type HookRow = z.infer<typeof hookRowSchema>;
export type HookInsert = z.infer<typeof hookInsertSchema>;
