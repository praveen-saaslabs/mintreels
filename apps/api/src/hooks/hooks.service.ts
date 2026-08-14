import { Inject, Injectable } from '@nestjs/common';
import type { VectorStoreProvider } from '@mintreels/ai';
import {
  ClipRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  RecordingRepository,
  TranscriptRepository,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import { JobStatus, JobStepName, JobStepStatus, JobType } from '@mintreels/schema';
import type { Ownership } from '../auth/auth.types';
import { toHookClipSummary } from '../clips/clips.service';
import { HttpError } from '../common/http-error';
import { QUEUE_PROVIDER, VECTOR_STORE_PROVIDER } from '../providers/provider-tokens';

/** Steps the GENERATE_HOOKS job drives in the worker (see executeHookPipeline). */
const HOOK_JOB_STEPS = [
  JobStepName.Hooks,
  JobStepName.HookEmbeddings,
  JobStepName.ClipRecommendations,
] as const;

@Injectable()
export class HooksService {
  constructor(
    private readonly hooks: HookRepository,
    private readonly recordings: RecordingRepository,
    private readonly clips: ClipRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly jobs: JobRepository,
    private readonly jobSteps: JobStepRepository,
    private readonly jobAuditLogs: JobAuditLogRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
    @Inject(VECTOR_STORE_PROVIDER) private readonly vectorStore: VectorStoreProvider,
  ) {}

  async listByRecordingId(recordingId: number, owner: Ownership) {
    const recording = await this.recordings.findByIdForOwner(recordingId, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const [hooks, clips] = await Promise.all([
      this.hooks.listByRecordingId(recordingId),
      this.clips.listByRecordingId(recordingId),
    ]);
    const latestClipByHookId = new Map<number, (typeof clips)[number]>();
    for (const clip of clips) {
      if (clip.hookId == null) {
        continue;
      }
      if (!latestClipByHookId.has(clip.hookId)) {
        latestClipByHookId.set(clip.hookId, clip);
      }
    }

    return hooks.map((hook) => {
      const clip = latestClipByHookId.get(hook.id);
      return {
        id: hook.id,
        recordingId: hook.recordingId,
        title: hook.title,
        hook: hook.hook,
        reason: hook.reason,
        hookType: hook.hookType,
        status: hook.status,
        startMs: hook.startMs,
        endMs: hook.endMs,
        clipStartMs: hook.clipStartMs,
        clipEndMs: hook.clipEndMs,
        durationMs: hook.endMs - hook.startMs,
        score: hook.score,
        createdAt: hook.createdAt,
        clip: clip ? toHookClipSummary(clip) : null,
      };
    });
  }

  /**
   * Enqueue a standalone GENERATE_HOOKS job (plan §20/§28). No LLM work happens in the request —
   * the worker re-runs hook discovery → embeddings → dedup/clips against the existing transcript.
   * Existing hooks and their vectors are cleared first so this is a clean regeneration.
   */
  async generate(recordingId: number, owner: Ownership) {
    const recording = await this.recordings.findByIdForOwner(recordingId, owner);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const transcript = await this.transcripts.findByRecordingId(recordingId);
    if (!transcript) {
      throw new HttpError(409, 'Transcript is not ready');
    }

    await this.vectorStore.deleteByRecordingId(recordingId);
    await this.hooks.delete({ recordingId });

    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.GenerateHooks,
        recordingId,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: null,
      }),
    );

    await this.jobSteps.save(
      HOOK_JOB_STEPS.map((step) =>
        this.jobSteps.create({
          jobId: job.id,
          step,
          status: JobStepStatus.Pending,
          attempt: 0,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          provider: null,
          providerJobId: null,
          idempotencyKey: `${String(recordingId)}:${String(job.id)}:${step}`,
          result: null,
          error: null,
          startedAt: null,
          completedAt: null,
        }),
      ),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'GENERATE_HOOKS enqueued',
        metadata: null,
      }),
    );

    await this.queue.enqueue({
      id: `generate-hooks-${String(job.id)}`,
      name: 'generate-hooks',
      payload: { recordingId, jobId: job.id },
      maxAttempts: 3,
    });

    return { recordingId, jobId: job.id };
  }
}
