import { z } from 'zod';
import { clipFitModeSchema, clipRatioSchema } from '@mintreels/schema';

export const createRecordingRequestSchema = z.object({
  title: z.string().min(1),
  originalFilename: z.string().min(1),
  url: z.string().url().max(2048),
});

export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;

export const exportRecordingRequestSchema = z
  .object({
    aspectRatio: clipRatioSchema.optional(),
    fitMode: clipFitModeSchema.optional(),
    burnSubtitles: z.boolean().optional(),
    force: z.boolean().optional(),
  })
  .default({});

export type ExportRecordingRequest = z.infer<typeof exportRecordingRequestSchema>;
