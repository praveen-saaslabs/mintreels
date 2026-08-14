import { z } from 'zod';
import { clipVoiceoverSchema } from '@mintreels/schema';

export const createRecordingRequestSchema = z.object({
  title: z.string().min(1),
  originalFilename: z.string().min(1),
  url: z.string().url().max(2048),
});

export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;

/** Body for POST /api/recordings/:id/voiceover — always enabled when submitted. */
export const applyRecordingVoiceoverRequestSchema = clipVoiceoverSchema
  .omit({ enabled: true })
  .extend({
    titleText: z.string().trim().min(1).max(500).optional(),
    ctaText: z.string().trim().min(1).max(500).optional(),
    script: z.string().trim().min(1).max(2000).optional(),
  })
  .refine(
    (value) =>
      (value.script !== undefined && value.script.length > 0) ||
      (value.titleText !== undefined && value.titleText.length > 0) ||
      (value.ctaText !== undefined && value.ctaText.length > 0),
    { message: 'Provide script, titleText, or ctaText' },
  );

export type ApplyRecordingVoiceoverRequest = z.infer<typeof applyRecordingVoiceoverRequestSchema>;
