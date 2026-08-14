import { z } from 'zod';
import { deletedAtSchema, idSchema } from './common';
import { JobStatus, JobType } from './enums';

/**
 * jobs — docs/architecture.md §29
 *
 * type: VIDEO_INGEST | TRANSCRIBE | GENERATE_SUMMARY | SYNC_KNOWLEDGE_BASE | GENERATE_HOOKS | RENDER_CLIP | APPLY_OVERDUB | APPLY_RECORDING_VOICEOVER
 * status: queued | running | success | failed | partial
 */
export const jobTypeSchema = z.enum([
  JobType.VideoIngest,
  JobType.Transcribe,
  JobType.GenerateSummary,
  JobType.SyncKnowledgeBase,
  JobType.GenerateHooks,
  JobType.RenderClip,
  JobType.ApplyOverdub,
  JobType.ApplyRecordingVoiceover,
]);

export const jobStatusSchema = z.enum([
  JobStatus.Queued,
  JobStatus.Running,
  JobStatus.Success,
  JobStatus.Failed,
  JobStatus.Partial,
]);

export const jobRowSchema = z
  .object({
    id: idSchema,
    type: jobTypeSchema,
    recordingId: idSchema.nullable(),
    status: jobStatusSchema,
    attempt: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    error: z.string().nullable(),
    errorCode: z.string().nullable(),
    errorMetadata: z.record(z.string(), z.unknown()).nullable(),
    currentStep: z.string().nullable(),
    startedAt: z.coerce.date().nullable(),
    finishedAt: z.coerce.date().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date().nullable(),
  })
  .merge(deletedAtSchema);

export const jobInsertSchema = jobRowSchema.partial({
  id: true,
  recordingId: true,
  attempt: true,
  maxAttempts: true,
  error: true,
  errorCode: true,
  errorMetadata: true,
  currentStep: true,
  startedAt: true,
  finishedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export { JobStatus, JobType } from './enums';
export type JobRow = z.infer<typeof jobRowSchema>;
export type JobInsert = z.infer<typeof jobInsertSchema>;
