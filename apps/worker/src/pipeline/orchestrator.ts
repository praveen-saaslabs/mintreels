import type { Job } from '@mintreels/db';
import type { JobStatus as DomainJobStatus } from '@mintreels/domain';
import { JOB_STEP_NAMES, JobStatus, JobStepName, JobType, RecordingStatus } from '@mintreels/schema';
import { writeAudit } from './audit';
import { loadJobConfig } from './config';
import type { WorkerDeps } from './deps';
import { pipelineLog } from './log';
import { executeStep, StepRetryLaterError, type StepHandler, type StepStore } from './step-runner';
import {
  actionItemsHandler,
  audioExtractionHandler,
  audioUploadHandler,
  clipRecommendationsHandler,
  hooksHandler,
  summaryHandler,
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
    [JobStepName.Hooks]: hooksHandler(deps),
    [JobStepName.ClipRecommendations]: clipRecommendationsHandler(),
  };
}

function stepStore(deps: WorkerDeps): StepStore {
  return {
    find: (jobId, step) => deps.jobSteps.findByJobIdAndStep(jobId, step),
    save: (row) => deps.jobSteps.save(row),
  };
}

export async function executePipeline(
  input: { recordingId: number; jobId?: number },
  deps: WorkerDeps,
): Promise<DomainJobStatus> {
  const config = loadJobConfig();
  const recording = await deps.recordings.findOneByOrFail({ id: input.recordingId });
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

  recording.status = RecordingStatus.Processing;
  await deps.recordings.save(recording);

  const store = stepStore(deps);
  const stepHandlers = handlers(deps);
  let analysisFailed = false;

  const audit = async (event: string, message: string, step: { step: string }) => {
    await writeAudit(deps.jobAuditLogs, {
      jobId: job.id,
      step: step.step,
      event,
      message,
    });
  };

  const runStep = async (stepName: JobStepName) => {
    job.currentStep = stepName;
    await deps.jobs.save(job);

    const outcome = await executeStep({
      jobId: job.id,
      recordingId: input.recordingId,
      stepName,
      store,
      handler: stepHandlers[stepName],
      options: {
        staleTimeoutMs: config.staleTimeoutMs,
        retryBaseDelayMs: config.retryBaseDelayMs,
        audit: async (event, message, step) => {
          await audit(event, message, step);
        },
      },
    });

    console.log(
      pipelineLog({
        jobId: job.id,
        recordingId: input.recordingId,
        step: stepName,
        attempt: job.attempt,
        message: outcome,
      }),
    );

    return outcome;
  };

  try {
    for (const stepName of CRITICAL_STEPS) {
      const outcome = await runStep(stepName);
      if (outcome === 'failed') {
        job.status = JobStatus.Failed;
        job.error = `${stepName} failed`;
        job.errorCode = 'step_failed';
        job.finishedAt = new Date();
        await deps.jobs.save(job);
        recording.status = RecordingStatus.Failed;
        await deps.recordings.save(recording);
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
      recording.status = transcript ? RecordingStatus.Ready : RecordingStatus.Failed;
      await deps.recordings.save(recording);
      return JobStatus.Partial;
    }

    job.status = JobStatus.Success;
    job.finishedAt = new Date();
    job.error = null;
    job.errorCode = null;
    await deps.jobs.save(job);
    recording.status = transcript ? RecordingStatus.Ready : RecordingStatus.Failed;
    await deps.recordings.save(recording);
    return transcript ? JobStatus.Success : JobStatus.Failed;
  } catch (error) {
    if (error instanceof StepRetryLaterError) {
      throw error;
    }
    job.status = JobStatus.Failed;
    job.error = error instanceof Error ? error.message : 'Pipeline failed';
    job.errorCode = 'pipeline_error';
    job.finishedAt = new Date();
    await deps.jobs.save(job);
    recording.status = RecordingStatus.Failed;
    await deps.recordings.save(recording);
    throw error;
  }
}
