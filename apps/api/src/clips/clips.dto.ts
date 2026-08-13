import { clipInsertSchema } from '@mintreels/schema';
import { z } from 'zod';

/** Client request body for POST /api/clips — server sets id, storage keys, status, createdAt. */
export const createClipRequestSchema = clipInsertSchema.omit({
  id: true,
  storageKey: true,
  thumbnailStorageKey: true,
  status: true,
  createdAt: true,
});

export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;
