import type {
  CanonicalTranscript,
  Transcript,
  TranscriptSegment,
  TranscriptionInput,
  TranscriptionSubmission,
  TranscriptionSubmitInput,
} from '@mintreels/domain';
import type { SpeechProvider } from '../../speech-provider';
import { ProviderError } from '../../provider-error';
import type { PyAIClient } from './client';
import { mapPyAIError } from './errors';
import { jobResultUrl, mapJobToSubmission, mapResultToCanonical, type PyAITranscriptionJobLike } from './mapper';

const POLL_INTERVAL_MS = 5_000;
const POLL_CAP_MS = 1_800_000;
const HEAR_MODEL = 'pyai-hear';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toDomainTranscript(recordingId: number, canonical: CanonicalTranscript): Transcript {
  const segments: TranscriptSegment[] = canonical.segments.map((segment) => {
    const mapped: TranscriptSegment = {
      id: 0,
      sequence: segment.sequence,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
    };
    if (segment.speaker !== undefined) {
      mapped.speaker = segment.speaker;
    }
    return mapped;
  });
  const transcript: Transcript = { id: 0, recordingId, segments };
  if (canonical.language !== undefined) {
    transcript.language = canonical.language;
  }
  return transcript;
}

async function fetchCanonicalFromResultUrl(resultUrl: string): Promise<CanonicalTranscript> {
  let response: Response;
  try {
    response = await fetch(resultUrl);
  } catch (error) {
    throw mapPyAIError(error);
  }
  if (!response.ok) {
    throw new ProviderError({
      provider: 'pyai',
      code: 'result_url_fetch_failed',
      message: `Failed to fetch transcription result (${String(response.status)})`,
      retryable: response.status === 429 || response.status >= 500,
    });
  }
  const payload: unknown = await response.json();
  return mapResultToCanonical(payload);
}

export class PyAISpeechProvider implements SpeechProvider {
  constructor(private readonly client: PyAIClient) {}

  async submitTranscription(input: TranscriptionSubmitInput): Promise<TranscriptionSubmission> {
    try {
      if (input.audio !== undefined) {
        const job = await this.client.createTranscriptionJobFromFile({
          body: input.audio.body,
          filename: input.audio.filename,
          ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
        });
        return mapJobToSubmission(job as PyAITranscriptionJobLike);
      }
      if (input.audioUrl === undefined || input.audioUrl.trim() === '') {
        throw new ProviderError({
          provider: 'pyai',
          code: 'invalid_request_error',
          message: 'audio or audioUrl is required',
          retryable: false,
        });
      }
      const job = await this.client.sdk.transcriptionJobs.create(
        {
          audio_url: input.audioUrl,
          model: HEAR_MODEL,
          diarize: true,
          output_formats: ['json'],
        },
        input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {},
      );
      return mapJobToSubmission(job);
    } catch (error) {
      throw mapPyAIError(error);
    }
  }

  async getTranscriptionStatus(providerJobId: string): Promise<TranscriptionSubmission> {
    try {
      const job = await this.client.sdk.transcriptionJobs.get(providerJobId);
      return mapJobToSubmission(job);
    } catch (error) {
      throw mapPyAIError(error);
    }
  }

  async getTranscriptionResult(providerJobId: string): Promise<CanonicalTranscript> {
    try {
      const job = await this.client.sdk.transcriptionJobs.get(providerJobId);
      const like = job as PyAITranscriptionJobLike;
      if (job.result !== undefined && job.result !== null) {
        return mapResultToCanonical(job.result);
      }
      const resultUrl = jobResultUrl(like);
      if (resultUrl !== undefined) {
        return fetchCanonicalFromResultUrl(resultUrl);
      }
      throw new ProviderError({
        provider: 'pyai',
        code: 'malformed_result',
        message: 'Transcription job has no result',
        retryable: false,
      });
    } catch (error) {
      throw mapPyAIError(error);
    }
  }

  async transcribe(input: TranscriptionInput): Promise<Transcript> {
    if (input.audioUrl === undefined || input.audioUrl.trim() === '') {
      throw new ProviderError({
        provider: 'pyai',
        code: 'invalid_request_error',
        message: 'audioUrl is required to transcribe',
        retryable: false,
      });
    }
    const submitted = await this.submitTranscription({
      audioUrl: input.audioUrl,
      ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      recordingId: input.recordingId,
      storageKey: input.storageKey,
    });
    let status = submitted;
    const deadline = Date.now() + POLL_CAP_MS;
    while (status.status === 'queued' || status.status === 'running') {
      if (Date.now() >= deadline) {
        throw new ProviderError({
          provider: 'pyai',
          code: 'transcription_timeout',
          message: 'Transcription polling timed out',
          retryable: true,
        });
      }
      await sleep(POLL_INTERVAL_MS);
      status = await this.getTranscriptionStatus(status.providerJobId);
    }
    if (status.status !== 'completed') {
      throw new ProviderError({
        provider: 'pyai',
        code: 'transcription_failed',
        message: status.error ?? `Transcription ${status.status}`,
        retryable: false,
      });
    }
    const canonical = await this.getTranscriptionResult(status.providerJobId);
    return toDomainTranscript(input.recordingId, canonical);
  }
}
