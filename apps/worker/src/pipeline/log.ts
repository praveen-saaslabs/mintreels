export function pipelineLog(fields: {
  jobId: number;
  recordingId: number;
  step: string;
  attempt: number;
  provider?: string | null;
  providerJobId?: string | null;
  message: string;
}): string {
  const parts = [
    `job=${String(fields.jobId)}`,
    `recording=${String(fields.recordingId)}`,
    `step=${fields.step}`,
    `attempt=${String(fields.attempt)}`,
  ];
  if (fields.provider) {
    parts.push(`provider=${fields.provider}`);
  }
  if (fields.providerJobId) {
    parts.push(`provider_job_id=${fields.providerJobId}`);
  }
  return `[${parts.join(' ')}] ${fields.message}`;
}
