import { clipInsertSchema, clipVoiceoverSchema } from '@mintreels/schema';
import { z } from 'zod';

/** Client request body for POST /api/clips — server sets id, storage keys, status, createdAt. */
export const createClipRequestSchema = clipInsertSchema
  .omit({
    id: true,
    storageKey: true,
    thumbnailStorageKey: true,
    status: true,
    createdAt: true,
  })
  .extend({
    voiceover: clipVoiceoverSchema.optional().nullable(),
  });

export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;

/** Optional body for POST /api/recordings/:id/hooks/:hookId/export */
export const exportHookClipRequestSchema = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? {} : value),
  z.object({
    voiceover: clipVoiceoverSchema.optional().nullable(),
  }),
);

export type ExportHookClipRequest = z.infer<typeof exportHookClipRequestSchema>;
