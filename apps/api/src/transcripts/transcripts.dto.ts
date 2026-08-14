import { z } from 'zod';

export const patchTranscriptSegmentRequestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export type PatchTranscriptSegmentRequest = z.infer<typeof patchTranscriptSegmentRequestSchema>;

export const applyOverdubRequestSchema = z.object({
  voiceId: z.string().trim().min(1).max(200),
});

export type ApplyOverdubRequest = z.infer<typeof applyOverdubRequestSchema>;
