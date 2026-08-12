import { z } from 'zod';
import { idSchema } from './common';

/**
 * clips — docs/architecture.md §23
 *
 * Rendered from a selected hook / time range; status mirrors job lifecycle for exports.
 */
export const clipStatusSchema = z.enum(['queued', 'rendering', 'ready', 'failed']);

export const clipRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  hookId: idSchema.nullable(),
  title: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  subtitleStyle: z.string().nullable(),
  storageKey: z.string().nullable(),
  status: clipStatusSchema,
  createdAt: z.coerce.date(),
});

export const clipInsertSchema = clipRowSchema.partial({
  id: true,
  hookId: true,
  subtitleStyle: true,
  storageKey: true,
  createdAt: true,
});

export type ClipStatus = z.infer<typeof clipStatusSchema>;
export type ClipRow = z.infer<typeof clipRowSchema>;
export type ClipInsert = z.infer<typeof clipInsertSchema>;
