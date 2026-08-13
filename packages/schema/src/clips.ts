import { z } from 'zod';
import { idSchema } from './common';
import { ClipStatus } from './enums';

/**
 * clips — docs/architecture.md §23
 *
 * Rendered from a selected hook / time range; status mirrors job lifecycle for exports.
 */
export const clipStatusSchema = z.enum([
  ClipStatus.Queued,
  ClipStatus.Rendering,
  ClipStatus.Ready,
  ClipStatus.Failed,
]);

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

export { ClipStatus } from './enums';
export type ClipRow = z.infer<typeof clipRowSchema>;
export type ClipInsert = z.infer<typeof clipInsertSchema>;
