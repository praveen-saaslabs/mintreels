import { z } from 'zod';

export const createRecordingRequestSchema = z.object({
  title: z.string().min(1),
  originalFilename: z.string().min(1),
  url: z.string().url().max(2048),
});

export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;
