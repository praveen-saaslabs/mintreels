export type PipelineLogFields = {
  recordingId: number;
  step: string;
  message: string;
  jobId?: number;
  attempt?: number;
  /** Handler / queue job name, e.g. `export-recording`. */
  job?: string;
  clipId?: number;
  provider?: string | null;
  providerJobId?: string | null;
};

export function pipelineLog(fields: PipelineLogFields): string {
  const parts: string[] = [];
  if (fields.job) {
    parts.push(`job_name=${fields.job}`);
  }
  if (fields.jobId !== undefined) {
    parts.push(`job=${String(fields.jobId)}`);
  }
  parts.push(`recording=${String(fields.recordingId)}`);
  if (fields.clipId !== undefined) {
    parts.push(`clip=${String(fields.clipId)}`);
  }
  parts.push(`step=${fields.step}`);
  if (fields.attempt !== undefined) {
    parts.push(`attempt=${String(fields.attempt)}`);
  }
  if (fields.provider) {
    parts.push(`provider=${fields.provider}`);
  }
  if (fields.providerJobId) {
    parts.push(`provider_job_id=${fields.providerJobId}`);
  }
  return `[${parts.join(' ')}] ${fields.message}`;
}

export function logPipeline(fields: PipelineLogFields): void {
  console.log(pipelineLog(fields));
}

export function logPipelineError(fields: PipelineLogFields): void {
  console.error(pipelineLog(fields));
}
