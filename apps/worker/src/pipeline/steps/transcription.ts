import { isProviderError, ProviderError } from '@mintreels/ai';
import { JobStepName } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import { requireActiveRecording } from '../recording-gone';
import { loadJobConfig } from '../config';
import { pipelineLog } from '../log';
import { sleep } from '../retry';
import type { StepContext, StepHandler } from '../step-runner';

const POLL_MS = 5_000;
const PROVIDER = 'pyai';

function exactError(error: unknown): unknown {
  if (isProviderError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      provider: error.provider,
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs ?? null,
      metadata: error.metadata ?? null,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ?? null,
    };
  }
  return error;
}

function logTranscriptionError(ctx: StepContext, error: unknown): void {
  console.error(
    pipelineLog({
      jobId: ctx.jobId,
      recordingId: ctx.recordingId,
      step: ctx.step.step,
      attempt: ctx.attempt,
      provider: ctx.step.provider ?? PROVIDER,
      providerJobId: ctx.step.providerJobId,
      message: error instanceof Error ? error.message : 'unknown transcription error',
    }),
    exactError(error),
  );
}

async function resolveAudioStorageKey(
  deps: WorkerDeps,
  recordingId: number,
  jobId: number,
): Promise<string | null> {
  const recording = await requireActiveRecording(deps.recordings, recordingId);
  if (typeof recording.audioStorageKey === 'string' && recording.audioStorageKey.trim() !== '') {
    return recording.audioStorageKey;
  }

  const upload = await deps.jobSteps.findByJobIdAndStep(jobId, JobStepName.AudioUpload);
  const extraction = await deps.jobSteps.findByJobIdAndStep(jobId, JobStepName.AudioExtraction);
  const uploadKey = upload?.result?.key;
  const extractionKey = extraction?.result?.key;
  let recovered: string | null = null;
  if (typeof uploadKey === 'string' && uploadKey.trim() !== '') {
    recovered = uploadKey;
  } else if (typeof extractionKey === 'string' && extractionKey.trim() !== '') {
    recovered = extractionKey;
  }
  if (!recovered) {
    return null;
  }

  recording.audioStorageKey = recovered;
  await deps.recordings.save(recording);
  return recovered;
}

export function transcriptionHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    try {
      const audioStorageKey = await resolveAudioStorageKey(deps, ctx.recordingId, ctx.jobId);
      if (!audioStorageKey) {
        throw new ProviderError({
          provider: PROVIDER,
          code: 'invalid_request_error',
          message: 'audioStorageKey is missing',
          retryable: false,
        });
      }

      let providerJobId = ctx.step.providerJobId;
      if (!providerJobId) {
        // ponytail: load wav into memory so PyAI does not need a public audio_url (local S3/MinIO).
        const stream = await deps.storage.download(audioStorageKey);
        const audio = new Uint8Array(await new Response(stream).arrayBuffer());
        const submitted = await deps.speech.submitTranscription({
          audio: { body: audio, filename: 'audio.wav' },
          idempotencyKey: ctx.step.idempotencyKey,
          recordingId: ctx.recordingId,
          storageKey: audioStorageKey,
        });
        providerJobId = submitted.providerJobId;
        ctx.step.provider = PROVIDER;
        ctx.step.providerJobId = providerJobId;
        await deps.jobSteps.save(ctx.step);
      }

      const cap = Date.now() + loadJobConfig().staleTimeoutMs;
      let status = await deps.speech.getTranscriptionStatus(providerJobId);
      while (status.status === 'queued' || status.status === 'running') {
        if (Date.now() >= cap) {
          throw new ProviderError({
            provider: PROVIDER,
            code: 'transcription_timeout',
            message: 'Transcription still running',
            retryable: true,
          });
        }
        await sleep(POLL_MS);
        status = await deps.speech.getTranscriptionStatus(providerJobId);
      }
      if (status.status !== 'completed') {
        throw new ProviderError({
          provider: PROVIDER,
          code: 'transcription_failed',
          message: status.error ?? `Transcription ${status.status}`,
          retryable: false,
          metadata: {
            providerJobId,
            status: status.status,
            error: status.error ?? null,
          },
        });
      }

      const canonical = await deps.speech.getTranscriptionResult(providerJobId);
      return {
        provider: PROVIDER,
        providerJobId,
        text: canonical.text,
        durationMs: canonical.durationMs ?? null,
        speakerCount: canonical.speakerCount ?? null,
        words: canonical.words ?? [],
        formats: canonical.formats ?? null,
        segments: canonical.segments,
      };
    } catch (error) {
      logTranscriptionError(ctx, error);
      throw error;
    }
  };
}
