import { z } from 'zod';
import { idSchema } from './common';

/**
 * summaries — entity in docs/architecture.md §15 / §21.
 * Grounded summary text for a recording (quotes/timestamps live in structured content later).
 */
export const summaryRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  text: z.string().min(1),
  createdAt: z.coerce.date(),
});

export const summaryInsertSchema = summaryRowSchema.partial({
  id: true,
  createdAt: true,
});

export type SummaryRow = z.infer<typeof summaryRowSchema>;
export type SummaryInsert = z.infer<typeof summaryInsertSchema>;
