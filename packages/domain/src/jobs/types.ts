export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'partial';

export const JOB_NAMES = [
  'ingest-video',
  'transcribe',
  'summarize',
  'generate-hooks',
  'sync-knowledge-base',
  'render-clip',
  'apply-overdub',
] as const;

export type JobName = (typeof JOB_NAMES)[number];

export interface Job<T> {
  id?: string;
  name: JobName | string;
  payload: T;
  status?: JobStatus;
  attempts?: number;
  maxAttempts?: number;
}

export const DEFAULT_MAX_ATTEMPTS = 4;
