import { z } from 'zod';
import { deletedAtSchema, idSchema, timestampsSchema } from './common';
import { RecordingStatus } from './enums';

/**
 * recordings — docs/architecture.md §16
 *
 * status: uploaded | processing | ready | failed
 */
export const recordingStatusSchema = z.enum([
  RecordingStatus.Uploaded,
  RecordingStatus.Processing,
  RecordingStatus.Ready,
  RecordingStatus.Failed,
]);

export const recordingRowSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(1),
    originalFilename: z.string().min(1),
    storageKey: z.string().min(1),
    audioStorageKey: z.string().min(1).nullable(),
    thumbnailStorageKey: z.string().nullable(),
    durationMs: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    status: recordingStatusSchema,
  })
  .merge(timestampsSchema)
  .merge(deletedAtSchema);

export const recordingInsertSchema = recordingRowSchema.partial({
  id: true,
  audioStorageKey: true,
  thumbnailStorageKey: true,
  durationMs: true,
  width: true,
  height: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export { RecordingStatus } from './enums';
export type RecordingRow = z.infer<typeof recordingRowSchema>;
export type RecordingInsert = z.infer<typeof recordingInsertSchema>;
