import { z } from 'zod';
import { idSchema } from './common';

/**
 * jobs — docs/architecture.md §29
 *
 * type: VIDEO_INGEST | TRANSCRIBE | GENERATE_SUMMARY | SYNC_KNOWLEDGE_BASE | GENERATE_HOOKS | RENDER_CLIP
 * status: queued | running | success | failed
 */
export const jobTypeSchema = z.enum([
  'VIDEO_INGEST',
  'TRANSCRIBE',
  'GENERATE_SUMMARY',
  'SYNC_KNOWLEDGE_BASE',
  'GENERATE_HOOKS',
  'RENDER_CLIP',
]);

export const jobStatusSchema = z.enum(['queued', 'running', 'success', 'failed']);

export const jobRowSchema = z.object({
  id: idSchema,
  type: jobTypeSchema,
  recordingId: idSchema.nullable(),
  status: jobStatusSchema,
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  error: z.string().nullable(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});

export const jobInsertSchema = jobRowSchema.partial({
  id: true,
  recordingId: true,
  attempt: true,
  maxAttempts: true,
  error: true,
  startedAt: true,
  finishedAt: true,
  metadata: true,
  createdAt: true,
});

export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobRow = z.infer<typeof jobRowSchema>;
export type JobInsert = z.infer<typeof jobInsertSchema>;
