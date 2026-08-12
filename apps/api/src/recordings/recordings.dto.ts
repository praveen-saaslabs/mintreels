import { recordingInsertSchema } from '@mintreels/schema';
import { z } from 'zod';

/** Client request body for POST /api/recordings — server sets status, storageKey, etc. */
export const createRecordingRequestSchema = recordingInsertSchema.omit({
  id: true,
  status: true,
  storageKey: true,
  createdAt: true,
  updatedAt: true,
  durationMs: true,
  width: true,
  height: true,
});

export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;
