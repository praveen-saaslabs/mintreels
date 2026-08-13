import { ProviderError } from '@mintreels/ai';
import type { WorkerDeps } from '../deps';
import { loadJobConfig } from '../config';
import { sleep } from '../retry';
import type { StepHandler } from '../step-runner';

const POLL_MS = 5_000;
const PROVIDER = 'pyai';

export function transcriptionHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const recording = await deps.recordings.findOneByOrFail({ id: ctx.recordingId });
    if (!recording.audioStorageKey) {
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
      const stream = await deps.storage.download(recording.audioStorageKey);
      const audio = new Uint8Array(await new Response(stream).arrayBuffer());
      const submitted = await deps.speech.submitTranscription({
        audio: { body: audio, filename: 'audio.wav' },
        idempotencyKey: ctx.step.idempotencyKey,
        recordingId: recording.id,
        storageKey: recording.audioStorageKey,
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
      });
    }

    const canonical = await deps.speech.getTranscriptionResult(providerJobId);
    return {
      provider: PROVIDER,
      providerJobId,
      text: canonical.text,
      durationMs: canonical.durationMs ?? null,
      segments: canonical.segments,
    };
  };
}
