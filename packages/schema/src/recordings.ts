import { z } from 'zod';
import { deletedAtSchema, idSchema, timestampsSchema } from './common';
import { RecordingStatus } from './enums';
import { clipFitModeSchema, clipRatioSchema, clipStatusSchema } from './clips';

/**
 * recordings — docs/architecture.md §16
 *
 * status: uploaded | processing | ready | failed
 * exportStatus: queued | rendering | ready | failed (null = never exported)
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
    exportStorageKey: z.string().nullable(),
    exportThumbnailStorageKey: z.string().nullable(),
    exportStatus: clipStatusSchema.nullable(),
    exportAspectRatio: clipRatioSchema.nullable(),
    exportFitMode: clipFitModeSchema.nullable(),
    exportBurnSubtitles: z.boolean().nullable(),
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
  exportStorageKey: true,
  exportThumbnailStorageKey: true,
  exportStatus: true,
  exportAspectRatio: true,
  exportFitMode: true,
  exportBurnSubtitles: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export { ClipFitMode, ClipRatio, ClipStatus, RecordingStatus } from './enums';
export type RecordingRow = z.infer<typeof recordingRowSchema>;
export type RecordingInsert = z.infer<typeof recordingInsertSchema>;
