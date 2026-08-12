import { z } from 'zod';
import { idSchema } from './common';

/**
 * transcripts — entity in docs/architecture.md §15 (parent for segments).
 * transcript_segments — docs/architecture.md §17
 *
 * Segments are the canonical transcript representation (recording_id, not a blob).
 */
export const transcriptRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  language: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const transcriptInsertSchema = transcriptRowSchema.partial({
  id: true,
  language: true,
  createdAt: true,
});

export const transcriptSegmentRowSchema = z.object({
  id: idSchema,
  recordingId: idSchema,
  sequence: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  speaker: z.string().nullable(),
  text: z.string(),
});

export const transcriptSegmentInsertSchema = transcriptSegmentRowSchema.partial({
  id: true,
  speaker: true,
});

export type TranscriptRow = z.infer<typeof transcriptRowSchema>;
export type TranscriptInsert = z.infer<typeof transcriptInsertSchema>;
export type TranscriptSegmentRow = z.infer<typeof transcriptSegmentRowSchema>;
export type TranscriptSegmentInsert = z.infer<typeof transcriptSegmentInsertSchema>;
