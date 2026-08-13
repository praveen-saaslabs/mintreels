import type { JobAuditLogRepository } from '@mintreels/db';
import type { JobStepName } from '@mintreels/schema';

export async function writeAudit(
  logs: JobAuditLogRepository,
  input: {
    jobId: number;
    step?: JobStepName | string | null;
    event: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await logs.save(
    logs.create({
      jobId: input.jobId,
      step: input.step ?? null,
      event: input.event,
      message: input.message,
      metadata: input.metadata ?? null,
    }),
  );
}
