import type {
  CanonicalTranscriptFormats,
  CanonicalTranscriptSegment,
  CanonicalTranscriptWord,
} from '@mintreels/domain';
import { JobStepName } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import { requireActiveRecording } from '../recording-gone';
import type { StepHandler } from '../step-runner';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asSegments(value: unknown): CanonicalTranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is CanonicalTranscriptSegment => {
    if (typeof item !== 'object' || item === null) return false;
    const rec = item as CanonicalTranscriptSegment;
    return typeof rec.startMs === 'number' && typeof rec.endMs === 'number' && typeof rec.text === 'string';
  });
}

function asWords(value: unknown): CanonicalTranscriptWord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is CanonicalTranscriptWord => {
    if (!isRecord(item)) return false;
    return (
      typeof item.word === 'string' &&
      typeof item.startMs === 'number' &&
      typeof item.endMs === 'number'
    );
  });
}

function asFormats(value: unknown): CanonicalTranscriptFormats | null {
  if (!isRecord(value)) {
    return null;
  }
  const formats: CanonicalTranscriptFormats = {};
  if (typeof value.srt === 'string' && value.srt.startsWith('http')) {
    formats.srt = value.srt;
  }
  if (typeof value.vtt === 'string' && value.vtt.startsWith('http')) {
    formats.vtt = value.vtt;
  }
  return formats.srt !== undefined || formats.vtt !== undefined ? formats : null;
}

export function transcriptionPersistHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const existing = await deps.transcripts.findByRecordingId(ctx.recordingId);
    if (existing) {
      return { transcriptId: existing.id, skipped: true };
    }

    const transcription = await deps.jobSteps.findByJobIdAndStep(ctx.jobId, JobStepName.Transcription);
    const result = transcription?.result ?? {};
    const segments = asSegments(result.segments);
    const words = asWords(result.words);
    const formats = asFormats(result.formats);
    const text = typeof result.text === 'string' ? result.text : segments.map((s) => s.text).join(' ');
    const durationMs = typeof result.durationMs === 'number' ? result.durationMs : null;
    const speakerCount = typeof result.speakerCount === 'number' ? result.speakerCount : null;
    const provider = typeof result.provider === 'string' ? result.provider : transcription?.provider;
    const providerJobId =
      typeof result.providerJobId === 'string' ? result.providerJobId : transcription?.providerJobId;

    const extras: Record<string, unknown> = {};
    if (words.length > 0) {
      extras.words = words;
    }
    if (formats !== null) {
      extras.formats = formats;
    }
    if (speakerCount !== null) {
      extras.speakerCount = speakerCount;
    }

    const transcript = await deps.transcripts.save(
      deps.transcripts.create({
        recordingId: ctx.recordingId,
        language: 'en',
        provider: provider ?? null,
        providerJobId: providerJobId ?? null,
        status: 'completed',
        text,
        durationMs,
        // ponytail: caption URLs expire (~7d); swap to self-hosted VTT/SRT if playback must outlive that.
        rawResponse: Object.keys(extras).length > 0 ? extras : null,
      }),
    );

    if (segments.length > 0) {
      await deps.segments.save(
        segments.map((segment, index) =>
          deps.segments.create({
            recordingId: ctx.recordingId,
            sequence: segment.sequence ?? index,
            startMs: segment.startMs,
            endMs: segment.endMs,
            speaker: segment.speaker ?? null,
            text: segment.text,
          }),
        ),
      );
    }

    const recording = await requireActiveRecording(deps.recordings, ctx.recordingId);
    if (durationMs !== null) {
      recording.durationMs = durationMs;
      await deps.recordings.save(recording);
    }

    return { transcriptId: transcript.id };
  };
}
