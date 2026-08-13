import { z } from 'zod';
import { deletedAtSchema, idSchema } from './common';

export const jobAuditLogRowSchema = z
  .object({
    id: idSchema,
    jobId: idSchema,
    step: z.string().nullable(),
    event: z.string().min(1),
    message: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.coerce.date(),
  })
  .merge(deletedAtSchema);

export const jobAuditLogInsertSchema = jobAuditLogRowSchema.partial({
  id: true,
  step: true,
  metadata: true,
  createdAt: true,
  deletedAt: true,
});

export type JobAuditLogRow = z.infer<typeof jobAuditLogRowSchema>;
export type JobAuditLogInsert = z.infer<typeof jobAuditLogInsertSchema>;
