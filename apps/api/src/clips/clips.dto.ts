import { clipFitModeSchema, clipInsertSchema, clipRatioSchema } from '@mintreels/schema';
import { z } from 'zod';

/** Client request body for POST /api/clips — server sets id, storage keys, status, createdAt. */
export const createClipRequestSchema = clipInsertSchema.omit({
  id: true,
  storageKey: true,
  thumbnailStorageKey: true,
  status: true,
  createdAt: true,
  deletedAt: true,
});

export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;

/** Optional body for POST /api/recordings/:id/hooks/:hookId/export */
export const exportHookClipRequestSchema = z
  .object({
    aspectRatio: clipRatioSchema.optional(),
    fitMode: clipFitModeSchema.optional(),
    burnSubtitles: z.boolean().optional(),
    subtitleStyle: z.string().nullable().optional(),
  })
  .default({});

export type ExportHookClipRequest = z.infer<typeof exportHookClipRequestSchema>;
