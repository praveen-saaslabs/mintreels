import { isProviderError, isRetryableProviderError } from '@mintreels/ai';
import { JobStepName, JobStepStatus } from '@mintreels/schema';
import { pipelineLog } from './log';
import { backoffMs, sleep as defaultSleep } from './retry';

export class StepRetryLaterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StepRetryLaterError';
  }
}

export type StepRecord = {
  id: number;
  jobId: number;
  step: JobStepName;
  status: JobStepStatus;
  attempt: number;
  maxAttempts: number;
  provider: string | null;
  providerJobId: string | null;
  idempotencyKey: string;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export interface StepStore {
  find(jobId: number, step: JobStepName): Promise<StepRecord | null>;
  save(row: StepRecord): Promise<StepRecord>;
}

export type StepContext = {
  jobId: number;
  recordingId: number;
  step: StepRecord;
  attempt: number;
};

export type StepHandler = (ctx: StepContext) => Promise<Record<string, unknown> | void>;

export type StepOutcome = 'completed' | 'skipped' | 'failed';

export type StepRunnerOptions = {
  staleTimeoutMs: number;
  retryBaseDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  audit?: (event: string, message: string, step: StepRecord) => Promise<void>;
};

function errorPayload(error: unknown): Record<string, unknown> {
  if (isProviderError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.metadata ? { metadata: error.metadata } : {}),
    };
  }
  return {
    code: 'internal_error',
    message: error instanceof Error ? error.message : 'Unknown error',
    retryable: false,
  };
}

function isRetryable(error: unknown): boolean {
  if (isRetryableProviderError(error)) {
    return true;
  }
  if (isProviderError(error)) {
    return false;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('still processing') || message.includes('timeout') || message.includes('econn');
  }
  return false;
}

export async function executeStep(input: {
  jobId: number;
  recordingId: number;
  stepName: JobStepName;
  store: StepStore;
  handler: StepHandler;
  options: StepRunnerOptions;
}): Promise<StepOutcome> {
  const { store, handler, options } = input;
  const sleepFn = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const audit = options.audit ?? (async () => undefined);

  const loaded = await store.find(input.jobId, input.stepName);
  if (!loaded) {
    throw new Error(`Missing job step ${input.stepName} for job ${String(input.jobId)}`);
  }
  let step = loaded;

  if (step.status === JobStepStatus.Completed) {
    return 'completed';
  }
  if (step.status === JobStepStatus.Skipped) {
    return 'skipped';
  }
  if (step.status === JobStepStatus.Failed && step.attempt >= step.maxAttempts) {
    return 'failed';
  }

  const stale =
    step.status === JobStepStatus.Processing &&
    step.startedAt !== null &&
    now() - step.startedAt.getTime() > options.staleTimeoutMs;

  if (step.status === JobStepStatus.Processing && !stale) {
    if (step.providerJobId) {
      return runOnce(step, input, handler, store, audit);
    }
    throw new StepRetryLaterError('still processing');
  }

  while (true) {
    if (step.attempt >= step.maxAttempts && step.status === JobStepStatus.Failed) {
      return 'failed';
    }

    const delay = backoffMs(step.attempt + 1, options.retryBaseDelayMs);
    if (delay > 0 && step.status !== JobStepStatus.Pending) {
      await sleepFn(delay);
    }

    step.attempt += 1;
    step.status = JobStepStatus.Processing;
    step.startedAt = new Date(now());
    step.error = null;
    step = await store.save(step);
    await audit('step_started', `started attempt ${String(step.attempt)}`, step);
    console.log(
      pipelineLog({
        jobId: input.jobId,
        recordingId: input.recordingId,
        step: step.step,
        attempt: step.attempt,
        provider: step.provider,
        providerJobId: step.providerJobId,
        message: 'started',
      }),
    );

    try {
      const result = await handler({
        jobId: input.jobId,
        recordingId: input.recordingId,
        step,
        attempt: step.attempt,
      });
      const latest = await store.find(input.jobId, input.stepName);
      step = latest ?? step;
      if (result) {
        step.result = result;
      }
      if (result?.skipped === true && input.stepName === JobStepName.ClipRecommendations) {
        step.status = JobStepStatus.Skipped;
        step.completedAt = new Date(now());
        await store.save(step);
        await audit('step_skipped', 'hooks already are clip windows', step);
        return 'skipped';
      }
      step.status = JobStepStatus.Completed;
      step.completedAt = new Date(now());
      step.error = null;
      await store.save(step);
      await audit('step_completed', 'completed', step);
      return 'completed';
    } catch (error) {
      if (error instanceof StepRetryLaterError) {
        throw error;
      }
      const latest = await store.find(input.jobId, input.stepName);
      step = latest ?? step;
      const retryable = isRetryable(error);
      step.error = errorPayload(error);
      await audit('step_failed', error instanceof Error ? error.message : 'step failed', step);
      console.log(
        pipelineLog({
          jobId: input.jobId,
          recordingId: input.recordingId,
          step: step.step,
          attempt: step.attempt,
          provider: step.provider,
          providerJobId: step.providerJobId,
          message: error instanceof Error ? error.message : 'failed',
        }),
      );

      if (!retryable || step.attempt >= step.maxAttempts) {
        step.status = JobStepStatus.Failed;
        await store.save(step);
        return 'failed';
      }

      step.status = JobStepStatus.Retrying;
      await store.save(step);
      await audit('step_retrying', `retrying after attempt ${String(step.attempt)}`, step);
    }
  }
}

async function runOnce(
  step: StepRecord,
  input: {
    jobId: number;
    recordingId: number;
    stepName: JobStepName;
  },
  handler: StepHandler,
  store: StepStore,
  audit: (event: string, message: string, step: StepRecord) => Promise<void>,
): Promise<StepOutcome> {
  let current = step;
  current.status = JobStepStatus.Processing;
  current.startedAt = current.startedAt ?? new Date();
  current = await store.save(current);
    try {
      const result = await handler({
        jobId: input.jobId,
        recordingId: input.recordingId,
        step: current,
        attempt: current.attempt,
      });
      const latest = await store.find(input.jobId, input.stepName);
      current = latest ?? current;
      if (result) {
        current.result = result;
      }
      current.status = JobStepStatus.Completed;
      current.completedAt = new Date();
      current.error = null;
      await store.save(current);
      await audit('step_completed', 'completed', current);
      return 'completed';
    } catch (error) {
      if (isRetryable(error) || error instanceof StepRetryLaterError) {
        throw new StepRetryLaterError(error instanceof Error ? error.message : 'still processing');
      }
      throw error;
    }
}
