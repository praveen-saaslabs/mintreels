import { z } from 'zod';
import { idSchema } from './common';

/**
 * summaries — entity in docs/architecture.md §15 / §21.
 * Grounded summary text for a recording (quotes/timestamps live in structured content later).
 */
export const actionItemSchema = z.object({
  text: z.string().min(1),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional(),
});

export const summaryRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  text: z.string().min(1),
  actionItems: z.array(actionItemSchema).nullable(),
  keyPoints: z.array(z.string()).nullable(),
  createdAt: z.coerce.date(),
});

export const summaryInsertSchema = summaryRowSchema.partial({
  id: true,
  actionItems: true,
  keyPoints: true,
  createdAt: true,
});

export type SummaryRow = z.infer<typeof summaryRowSchema>;
export type SummaryInsert = z.infer<typeof summaryInsertSchema>;
