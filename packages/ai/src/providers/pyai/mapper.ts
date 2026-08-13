import type {
  CanonicalTranscript,
  CanonicalTranscriptFormats,
  CanonicalTranscriptSegment,
  CanonicalTranscriptWord,
  TranscriptionSubmission,
} from '@mintreels/domain';
import { ProviderError } from '../../provider-error';

const SUBMISSION_STATUSES = new Set(['queued', 'running', 'completed', 'failed', 'cancelled']);

export interface PyAITranscriptionJobLike {
  job_id?: unknown;
  status?: unknown;
  result?: unknown;
  result_url?: unknown;
  error?: unknown;
}

interface PyAISegmentLike {
  start?: unknown;
  end?: unknown;
  text?: unknown;
  speaker?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function secondsToMs(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ProviderError({
      provider: 'pyai',
      code: 'malformed_result',
      message: `Transcription segment ${field} must be a non-negative number of seconds`,
      retryable: false,
    });
  }
  return Math.round(value * 1000);
}

export function mapJobToSubmission(job: PyAITranscriptionJobLike): TranscriptionSubmission {
  if (typeof job.job_id !== 'string' || job.job_id.trim() === '') {
    throw new ProviderError({
      provider: 'pyai',
      code: 'malformed_result',
      message: 'Transcription job is missing job_id',
      retryable: false,
    });
  }
  if (typeof job.status !== 'string' || !SUBMISSION_STATUSES.has(job.status)) {
    throw new ProviderError({
      provider: 'pyai',
      code: 'malformed_result',
      message: 'Transcription job has an unknown status',
      retryable: false,
    });
  }

  const submission: TranscriptionSubmission = {
    providerJobId: job.job_id,
    status: job.status as TranscriptionSubmission['status'],
  };
  if (typeof job.error === 'string' && job.error.trim() !== '') {
    submission.error = job.error;
  }
  return submission;
}

export function mapResultToCanonical(result: unknown): CanonicalTranscript {
  if (!isRecord(result)) {
    throw new ProviderError({
      provider: 'pyai',
      code: 'malformed_result',
      message: 'Transcription result is missing or malformed',
      retryable: false,
    });
  }

  if (result.segments !== undefined && !Array.isArray(result.segments)) {
    throw new ProviderError({
      provider: 'pyai',
      code: 'malformed_result',
      message: 'Transcription result.segments must be an array',
      retryable: false,
    });
  }

  const rawSegments = Array.isArray(result.segments) ? result.segments : [];
  const segments: CanonicalTranscriptSegment[] = rawSegments.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new ProviderError({
        provider: 'pyai',
        code: 'malformed_result',
        message: `Transcription segment ${String(index)} is malformed`,
        retryable: false,
      });
    }
    const segment: PyAISegmentLike = raw;
    const mapped: CanonicalTranscriptSegment = {
      sequence: index,
      startMs: secondsToMs(segment.start, 'start'),
      endMs: secondsToMs(segment.end, 'end'),
      text: typeof segment.text === 'string' ? segment.text : '',
    };
    if (typeof segment.speaker === 'string' && segment.speaker.trim() !== '') {
      mapped.speaker = segment.speaker;
    }
    return mapped;
  });

  const canonical: CanonicalTranscript = {
    text: typeof result.text === 'string' ? result.text : segments.map((s) => s.text).join(' '),
    segments,
  };
  if (typeof result.audio_seconds === 'number' && Number.isFinite(result.audio_seconds)) {
    canonical.durationMs = Math.round(result.audio_seconds * 1000);
  }
  if (
    typeof result.speakers === 'number' &&
    Number.isFinite(result.speakers) &&
    result.speakers >= 0
  ) {
    canonical.speakerCount = Math.round(result.speakers);
  }
  const words = mapWords(result.words);
  if (words !== undefined) {
    canonical.words = words;
  }
  const formats = mapFormats(result.formats);
  if (formats !== undefined) {
    canonical.formats = formats;
  }
  return canonical;
}

function mapWords(raw: unknown): CanonicalTranscriptWord[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const words: CanonicalTranscriptWord[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.word !== 'string' || item.word.trim() === '') {
      continue;
    }
    try {
      const mapped: CanonicalTranscriptWord = {
        word: item.word,
        startMs: secondsToMs(item.start, 'start'),
        endMs: secondsToMs(item.end, 'end'),
      };
      if (typeof item.speaker === 'string' && item.speaker.trim() !== '') {
        mapped.speaker = item.speaker;
      }
      words.push(mapped);
    } catch {
      // ponytail: skip a bad word rather than failing the whole transcript
    }
  }
  return words;
}

function mapFormats(raw: unknown): CanonicalTranscriptFormats | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const formats: CanonicalTranscriptFormats = {};
  const srt = optionalHttpUrl(raw.srt);
  const vtt = optionalHttpUrl(raw.vtt);
  if (srt !== undefined) {
    formats.srt = srt;
  }
  if (vtt !== undefined) {
    formats.vtt = vtt;
  }
  return formats.srt !== undefined || formats.vtt !== undefined ? formats : undefined;
}

function optionalHttpUrl(value: unknown): string | undefined {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : undefined;
}

export function jobResultUrl(job: PyAITranscriptionJobLike): string | undefined {
  return typeof job.result_url === 'string' && job.result_url.trim() !== '' ? job.result_url : undefined;
}
