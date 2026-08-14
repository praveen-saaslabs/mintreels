import { z } from 'zod';
import { deletedAtSchema, idSchema } from './common';
import { ClipFitMode, ClipRatio, ClipStatus } from './enums';

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

export const clipRatioSchema = z.enum([
  ClipRatio.Vertical,
  ClipRatio.Square,
  ClipRatio.Widescreen,
]);

export const clipFitModeSchema = z.enum([ClipFitMode.Fit, ClipFitMode.Fill]);

export const clipRowSchema = z
  .object({
    id: idSchema,
    recordingId: idSchema,
    hookId: idSchema.nullable(),
    title: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    aspectRatio: clipRatioSchema,
    fitMode: clipFitModeSchema,
    burnSubtitles: z.boolean(),
    subtitleStyle: z.string().nullable(),
    storageKey: z.string().nullable(),
    thumbnailStorageKey: z.string().nullable(),
    status: clipStatusSchema,
    createdAt: z.coerce.date(),
  })
  .merge(deletedAtSchema);

export const clipInsertSchema = clipRowSchema.partial({
  id: true,
  hookId: true,
  aspectRatio: true,
  fitMode: true,
  burnSubtitles: true,
  subtitleStyle: true,
  storageKey: true,
  thumbnailStorageKey: true,
  createdAt: true,
  deletedAt: true,
});

export { ClipFitMode, ClipStatus } from './enums';
export type ClipRow = z.infer<typeof clipRowSchema>;
export type ClipInsert = z.infer<typeof clipInsertSchema>;
