import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProviderError } from '@mintreels/ai';
import { JobStepName, JobStepStatus } from '@mintreels/schema';
import { executeStep, type StepHandler, type StepRecord, type StepStore } from './step-runner';
import { transcriptionHandler } from './steps/transcription';
import type { WorkerDeps } from './deps';

function makeStep(overrides: Partial<StepRecord> = {}): StepRecord {
  return {
    id: 1,
    jobId: 1,
    step: JobStepName.AudioExtraction,
    status: JobStepStatus.Pending,
    attempt: 0,
    maxAttempts: 4,
    provider: null,
    providerJobId: null,
    idempotencyKey: '1:1:AUDIO_EXTRACTION',
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

class MemoryStore implements StepStore {
  constructor(public row: StepRecord) {}
  async find(_jobId: number, _step: JobStepName): Promise<StepRecord | null> {
    return this.row;
  }
  async save(row: StepRecord): Promise<StepRecord> {
    this.row = { ...row };
    return this.row;
  }
}

const options = {
  staleTimeoutMs: 1_800_000,
  retryBaseDelayMs: 1,
  sleep: async () => undefined,
};

test('new job runs the first pending step', async () => {
  const store = new MemoryStore(makeStep());
  let ran = 0;
  const handler: StepHandler = async () => {
    ran += 1;
    return { ok: true };
  };
  const outcome = await executeStep({
    jobId: 1,
    recordingId: 10,
    stepName: JobStepName.AudioExtraction,
    store,
    handler,
    options,
  });
  assert.equal(outcome, 'completed');
  assert.equal(ran, 1);
  assert.equal(store.row.status, JobStepStatus.Completed);
  assert.equal(store.row.attempt, 1);
});

test('completed step is not re-executed', async () => {
  const store = new MemoryStore(
    makeStep({ status: JobStepStatus.Completed, attempt: 1, result: { ok: true } }),
  );
  let ran = 0;
  await executeStep({
    jobId: 1,
    recordingId: 10,
    stepName: JobStepName.AudioExtraction,
    store,
    handler: async () => {
      ran += 1;
    },
    options,
  });
  assert.equal(ran, 0);
});

test('failed step retries then stays failed on the 4th failure', async () => {
  const store = new MemoryStore(makeStep());
  let ran = 0;
  const outcome = await executeStep({
    jobId: 1,
    recordingId: 10,
    stepName: JobStepName.AudioExtraction,
    store,
    handler: async () => {
      ran += 1;
      throw new ProviderError({
        provider: 'pyai',
        code: 'rate_limit_exceeded',
        message: 'slow down',
        retryable: true,
      });
    },
    options,
  });
  assert.equal(outcome, 'failed');
  assert.equal(ran, 4);
  assert.equal(store.row.status, JobStepStatus.Failed);
  assert.equal(store.row.attempt, 4);
});

test('successful retry after a retryable failure', async () => {
  const store = new MemoryStore(makeStep());
  let ran = 0;
  const outcome = await executeStep({
    jobId: 1,
    recordingId: 10,
    stepName: JobStepName.AudioExtraction,
    store,
    handler: async () => {
      ran += 1;
      if (ran === 1) {
        throw new ProviderError({
          provider: 'pyai',
          code: 'rate_limit_exceeded',
          message: 'slow down',
          retryable: true,
        });
      }
      return { ok: true };
    },
    options,
  });
  assert.equal(outcome, 'completed');
  assert.equal(ran, 2);
  assert.equal(store.row.status, JobStepStatus.Completed);
});

test('stale processing recovers and re-runs', async () => {
  const store = new MemoryStore(
    makeStep({
      status: JobStepStatus.Processing,
      attempt: 1,
      startedAt: new Date(0),
    }),
  );
  let ran = 0;
  const outcome = await executeStep({
    jobId: 1,
    recordingId: 10,
    stepName: JobStepName.AudioExtraction,
    store,
    handler: async () => {
      ran += 1;
      return { recovered: true };
    },
    options: { ...options, staleTimeoutMs: 10, now: () => 1_000_000 },
  });
  assert.equal(outcome, 'completed');
  assert.equal(ran, 1);
  assert.equal(store.row.attempt, 2);
});

test('transcription reuses provider_job_id and does not submit again', async () => {
  let submits = 0;
  const step = makeStep({
    step: JobStepName.Transcription,
    provider: 'pyai',
    providerJobId: 'job-1',
    status: JobStepStatus.Pending,
  });
  const handler = transcriptionHandler({
    recordings: {
      findOneBy: async () => ({ id: 10, audioStorageKey: 'recordings/10/audio.wav' }),
    },
    storage: { getSignedUrl: async () => 'https://example.invalid/audio.wav' },
    speech: {
      submitTranscription: async () => {
        submits += 1;
        return { providerJobId: 'job-new', status: 'queued' };
      },
      getTranscriptionStatus: async () => ({ providerJobId: 'job-1', status: 'completed' }),
      getTranscriptionResult: async () => ({ text: 'hi', segments: [] }),
    },
    jobSteps: { save: async (row: StepRecord) => row },
  } as unknown as WorkerDeps);

  const result = await handler({ jobId: 1, recordingId: 10, step, attempt: 1 });
  assert.equal(submits, 0);
  assert.equal((result as { providerJobId: string }).providerJobId, 'job-1');
});

test('transient STT job failure is retryable and clears provider_job_id', async () => {
  const step = makeStep({
    step: JobStepName.Transcription,
    provider: 'pyai',
    providerJobId: 'job-dead',
    status: JobStepStatus.Pending,
  });
  let saved: StepRecord | null = null;
  const handler = transcriptionHandler({
    recordings: {
      findOneBy: async () => ({ id: 10, audioStorageKey: 'recordings/10/audio.wav' }),
    },
    storage: { getSignedUrl: async () => 'https://example.invalid/audio.wav' },
    speech: {
      submitTranscription: async () => ({ providerJobId: 'job-new', status: 'queued' }),
      getTranscriptionStatus: async () => ({
        providerJobId: 'job-dead',
        status: 'failed',
        error: 'stt: HTTP 500: Internal Server Error',
      }),
      getTranscriptionResult: async () => ({ text: 'hi', segments: [] }),
    },
    jobSteps: {
      save: async (row: StepRecord) => {
        saved = { ...row };
        return row;
      },
    },
  } as unknown as WorkerDeps);

  await assert.rejects(
    async () => handler({ jobId: 1, recordingId: 10, step, attempt: 1 }),
    (error: unknown) =>
      error instanceof ProviderError &&
      error.code === 'transcription_failed' &&
      error.retryable === true,
  );
  assert.equal(step.providerJobId, null);
  assert.equal(saved?.providerJobId ?? null, null);
});
