import type { Job } from '@mintreels/db';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { JOB_STEP_NAMES, JobStatus, JobStepName, JobType, RecordingStatus } from '@mintreels/schema';
import { writeAudit } from './audit';
import { loadJobConfig } from './config';
import type { WorkerDeps } from './deps';
import { logPipeline, logPipelineError } from './log';
import { RecordingGoneError } from './recording-gone';
import { executeStep, StepRetryLaterError, type StepHandler, type StepStore } from './step-runner';
import { ensureRecordingThumbnail } from './video-thumbnail';
import {
  actionItemsHandler,
  audioExtractionHandler,
  audioUploadHandler,
  clipRecommendationsHandler,
  hookEmbeddingsHandler,
  hooksHandler,
  summaryHandler,
  transcriptEmbeddingsHandler,
  transcriptionHandler,
  transcriptionPersistHandler,
} from './steps';

const CRITICAL = new Set<JobStepName>([
  JobStepName.AudioExtraction,
  JobStepName.AudioUpload,
  JobStepName.Transcription,
  JobStepName.TranscriptionPersist,
]);

const ANALYSIS = new Set<JobStepName>([
  JobStepName.Summary,
  JobStepName.ActionItems,
  JobStepName.TranscriptEmbeddings,
  JobStepName.Hooks,
]);

const CRITICAL_STEPS = JOB_STEP_NAMES.filter((step) => CRITICAL.has(step));
const ANALYSIS_STEPS = JOB_STEP_NAMES.filter((step) => ANALYSIS.has(step));
const TRAILING_STEPS = JOB_STEP_NAMES.filter((step) => !CRITICAL.has(step) && !ANALYSIS.has(step));

function handlers(deps: WorkerDeps): Record<JobStepName, StepHandler> {
  return {
    [JobStepName.AudioExtraction]: audioExtractionHandler(deps),
    [JobStepName.AudioUpload]: audioUploadHandler(deps),
    [JobStepName.Transcription]: transcriptionHandler(deps),
    [JobStepName.TranscriptionPersist]: transcriptionPersistHandler(deps),
    [JobStepName.Summary]: summaryHandler(deps),
    [JobStepName.ActionItems]: actionItemsHandler(deps),
    [JobStepName.TranscriptEmbeddings]: transcriptEmbeddingsHandler(deps),
    [JobStepName.Hooks]: hooksHandler(deps),
    [JobStepName.HookEmbeddings]: hookEmbeddingsHandler(deps),
    [JobStepName.ClipRecommendations]: clipRecommendationsHandler(deps),
  };
}

function stepStore(deps: WorkerDeps): StepStore {
  return {
    find: (jobId, step) => deps.jobSteps.findByJobIdAndStep(jobId, step),
    save: (row) => deps.jobSteps.save(row),
  };
}

async function setRecordingStatus(
  recordings: WorkerDeps['recordings'],
  recordingId: number,
  status: RecordingStatus,
): Promise<void> {
  await recordings.update({ id: recordingId }, { status });
}

/** Steps run by the standalone GENERATE_HOOKS job — hook discovery through clip boundaries only. */
const HOOK_PIPELINE_STEPS: JobStepName[] = [
  JobStepName.Hooks,
  JobStepName.HookEmbeddings,
  JobStepName.ClipRecommendations,
];

/** Builds the per-step runner shared by the full ingest pipeline and the hooks-only pipeline. */
function createRunStep(params: {
  job: Job;
  deps: WorkerDeps;
  recordingId: number;
  config: ReturnType<typeof loadJobConfig>;
  store: StepStore;
  stepHandlers: Record<JobStepName, StepHandler>;
  jobName: string;
}): (stepName: JobStepName) => Promise<Awaited<ReturnType<typeof executeStep>>> {
  const { job, deps, recordingId, config, store, stepHandlers, jobName } = params;
  return async (stepName: JobStepName) => {
    job.currentStep = stepName;
    await deps.jobs.save(job);

    const outcome = await executeStep({
      jobId: job.id,
      recordingId,
      stepName,
      store,
      handler: stepHandlers[stepName],
      options: {
        staleTimeoutMs: config.staleTimeoutMs,
        retryBaseDelayMs: config.retryBaseDelayMs,
        audit: async (event, message, step) => {
          await writeAudit(deps.jobAuditLogs, { jobId: job.id, step: step.step, event, message });
        },
      },
    });

    logPipeline({
      job: jobName,
      jobId: job.id,
      recordingId,
      step: stepName,
      attempt: job.attempt,
      message: outcome,
    });

    return outcome;
  };
}

export async function executePipeline(
  input: { recordingId: number; jobId?: number },
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const config = loadJobConfig();
  const recording = await deps.recordings.findOneBy({ id: input.recordingId });
  if (!recording) {
    logPipeline({
      job: 'ingest-video',
      recordingId: input.recordingId,
      step: 'pipeline',
      message: 'pipeline_start recording missing no-op',
      ...(input.jobId !== undefined ? { jobId: input.jobId } : {}),
    });
    return JobStatus.Success;
  }
  let job: Job | null =
    input.jobId !== undefined
      ? await deps.jobs.findOneBy({ id: input.jobId })
      : await deps.jobs.findLatestByRecordingAndType(input.recordingId, JobType.VideoIngest);

  if (!job) {
    job = await deps.jobs.save(
      deps.jobs.create({
        type: JobType.VideoIngest,
        recordingId: input.recordingId,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: config.maxAttempts,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: null,
      }),
    );
  }

  job.status = JobStatus.Running;
  job.startedAt = job.startedAt ?? new Date();
  job.attempt += 1;
  job.error = null;
  await deps.jobs.save(job);

  logPipeline({
    job: 'ingest-video',
    jobId: job.id,
    recordingId: input.recordingId,
    step: 'pipeline',
    attempt: job.attempt,
    message: 'pipeline_start',
  });

  await setRecordingStatus(deps.recordings, input.recordingId, RecordingStatus.Processing);
  await ensureRecordingThumbnail({ deps, recordingId: input.recordingId });

  const store = stepStore(deps);
  const stepHandlers = handlers(deps);
  let analysisFailed = false;

  const runStep = createRunStep({
    job,
    deps,
    recordingId: input.recordingId,
    config,
    store,
    stepHandlers,
    jobName: 'ingest-video',
  });

  try {
    for (const stepName of CRITICAL_STEPS) {
      const outcome = await runStep(stepName);
      if (outcome === 'failed') {
        job.status = JobStatus.Failed;
        job.error = `${stepName} failed`;
        job.errorCode = 'step_failed';
        job.finishedAt = new Date();
        await deps.jobs.save(job);
        await setRecordingStatus(deps.recordings, input.recordingId, RecordingStatus.Failed);
        logPipeline({
          job: 'ingest-video',
          jobId: job.id,
          recordingId: input.recordingId,
          step: 'pipeline',
          attempt: job.attempt,
          message: `pipeline_finish status=${JobStatus.Failed}`,
        });
        return JobStatus.Failed;
      }
    }

    const analysisOutcomes = await Promise.all(ANALYSIS_STEPS.map((stepName) => runStep(stepName)));
    if (analysisOutcomes.includes('failed')) {
      analysisFailed = true;
    }

    for (const stepName of TRAILING_STEPS) {
      const outcome = await runStep(stepName);
      if (outcome === 'failed') {
        analysisFailed = true;
      }
    }

    const transcript = await deps.transcripts.findByRecordingId(input.recordingId);
    if (analysisFailed) {
      job.status = JobStatus.Partial;
      job.errorCode = 'analysis_partial';
      job.finishedAt = new Date();
      await deps.jobs.save(job);
      await setRecordingStatus(
        deps.recordings,
        input.recordingId,
        transcript ? RecordingStatus.Ready : RecordingStatus.Failed,
      );
      logPipeline({
        job: 'ingest-video',
        jobId: job.id,
        recordingId: input.recordingId,
        step: 'pipeline',
        attempt: job.attempt,
        message: `pipeline_finish status=${JobStatus.Partial}`,
      });
      return JobStatus.Partial;
    }

    job.status = JobStatus.Success;
    job.finishedAt = new Date();
    job.error = null;
    job.errorCode = null;
    await deps.jobs.save(job);
    await setRecordingStatus(
      deps.recordings,
      input.recordingId,
      transcript ? RecordingStatus.Ready : RecordingStatus.Failed,
    );
    const finalStatus = transcript ? JobStatus.Success : JobStatus.Failed;
    logPipeline({
      job: 'ingest-video',
      jobId: job.id,
      recordingId: input.recordingId,
      step: 'pipeline',
      attempt: job.attempt,
      message: `pipeline_finish status=${finalStatus}`,
    });
    return finalStatus;
  } catch (error) {
    if (error instanceof RecordingGoneError) {
      logPipeline({
        job: 'ingest-video',
        jobId: job.id,
        recordingId: input.recordingId,
        step: 'pipeline',
        attempt: job.attempt,
        message: 'pipeline_finish recording gone no-op',
      });
      return JobStatus.Success;
    }
    if (error instanceof StepRetryLaterError) {
      throw error;
    }
    job.status = JobStatus.Failed;
    job.error = error instanceof Error ? error.message : 'Pipeline failed';
    job.errorCode = 'pipeline_error';
    job.finishedAt = new Date();
    await deps.jobs.save(job);
    await setRecordingStatus(deps.recordings, input.recordingId, RecordingStatus.Failed);
    logPipelineError({
      job: 'ingest-video',
      jobId: job.id,
      recordingId: input.recordingId,
      step: 'pipeline',
      attempt: job.attempt,
      message: `pipeline_finish status=${JobStatus.Failed} ${job.error}`,
    });
    throw error;
  }
}

/**
 * Standalone hooks pipeline for `POST /recordings/:id/hooks/generate` (plan §20/§26). Reuses the
 * transcript that ingest already produced and runs hook discovery → embeddings → dedup/clip boundaries.
 * The job + its `job_steps` are created by the API; this only drives them. Idempotent and resumable per
 * `job_steps` row, so a retry restarts from the failed step rather than re-running discovery.
 */
export async function executeHookPipeline(
  input: { recordingId: number; jobId: number },
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const config = loadJobConfig();
  const job = await deps.jobs.findOneBy({ id: input.jobId });
  if (!job) {
    throw new Error(`GENERATE_HOOKS job ${String(input.jobId)} not found`);
  }

  job.status = JobStatus.Running;
  job.startedAt = job.startedAt ?? new Date();
  job.attempt += 1;
  job.error = null;
  await deps.jobs.save(job);

  logPipeline({
    job: 'generate-hooks',
    jobId: job.id,
    recordingId: input.recordingId,
    step: 'pipeline',
    attempt: job.attempt,
    message: 'pipeline_start',
  });

  const store = stepStore(deps);
  const stepHandlers = handlers(deps);
  const runStep = createRunStep({
    job,
    deps,
    recordingId: input.recordingId,
    config,
    store,
    stepHandlers,
    jobName: 'generate-hooks',
  });

  try {
    let failed = false;
    for (const stepName of HOOK_PIPELINE_STEPS) {
      const outcome = await runStep(stepName);
      if (outcome === 'failed') {
        failed = true;
      }
    }

    job.status = failed ? JobStatus.Partial : JobStatus.Success;
    job.errorCode = failed ? 'analysis_partial' : null;
    job.error = null;
    job.finishedAt = new Date();
    await deps.jobs.save(job);
    logPipeline({
      job: 'generate-hooks',
      jobId: job.id,
      recordingId: input.recordingId,
      step: 'pipeline',
      attempt: job.attempt,
      message: `pipeline_finish status=${job.status}`,
    });
    return job.status;
  } catch (error) {
    if (error instanceof StepRetryLaterError) {
      throw error;
    }
    job.status = JobStatus.Failed;
    job.error = error instanceof Error ? error.message : 'Hook pipeline failed';
    job.errorCode = 'pipeline_error';
    job.finishedAt = new Date();
    await deps.jobs.save(job);
    logPipelineError({
      job: 'generate-hooks',
      jobId: job.id,
      recordingId: input.recordingId,
      step: 'pipeline',
      attempt: job.attempt,
      message: `pipeline_finish status=${JobStatus.Failed} ${job.error}`,
    });
    throw error;
  }
}
