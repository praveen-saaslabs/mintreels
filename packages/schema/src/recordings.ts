import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';

/**
 * recordings — docs/architecture.md §16
 *
 * status: uploaded | processing | ready | failed
 */
export const recordingStatusSchema = z.enum(['uploaded', 'processing', 'ready', 'failed']);

export const recordingRowSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(1),
    originalFilename: z.string().min(1),
    storageKey: z.string().min(1),
    durationMs: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    status: recordingStatusSchema,
  })
  .merge(timestampsSchema);

export const recordingInsertSchema = recordingRowSchema.partial({
  id: true,
  durationMs: true,
  width: true,
  height: true,
  createdAt: true,
  updatedAt: true,
});

export type RecordingStatus = z.infer<typeof recordingStatusSchema>;
export type RecordingRow = z.infer<typeof recordingRowSchema>;
export type RecordingInsert = z.infer<typeof recordingInsertSchema>;
