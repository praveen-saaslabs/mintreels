import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';
import { JobStepName, JobStepStatus } from './enums';

export const jobStepNameSchema = z.enum([
  JobStepName.AudioExtraction,
  JobStepName.AudioUpload,
  JobStepName.Transcription,
  JobStepName.TranscriptionPersist,
  JobStepName.Summary,
  JobStepName.ActionItems,
  JobStepName.Hooks,
  JobStepName.HookEmbeddings,
  JobStepName.ClipRecommendations,
]);

export const jobStepStatusSchema = z.enum([
  JobStepStatus.Pending,
  JobStepStatus.Processing,
  JobStepStatus.Completed,
  JobStepStatus.Retrying,
  JobStepStatus.Failed,
  JobStepStatus.Skipped,
]);

export const jobStepRowSchema = z
  .object({
    id: idSchema,
    jobId: idSchema,
    step: jobStepNameSchema,
    status: jobStepStatusSchema,
    attempt: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    provider: z.string().nullable(),
    providerJobId: z.string().nullable(),
    idempotencyKey: z.string().min(1),
    result: z.record(z.string(), z.unknown()).nullable(),
    error: z.record(z.string(), z.unknown()).nullable(),
    startedAt: z.coerce.date().nullable(),
    completedAt: z.coerce.date().nullable(),
  })
  .merge(timestampsSchema);

export const jobStepInsertSchema = jobStepRowSchema.partial({
  id: true,
  attempt: true,
  maxAttempts: true,
  provider: true,
  providerJobId: true,
  result: true,
  error: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export { JobStepName, JobStepStatus } from './enums';
export type JobStepRow = z.infer<typeof jobStepRowSchema>;
export type JobStepInsert = z.infer<typeof jobStepInsertSchema>;
