import type { CanonicalTranscriptSegment } from '@mintreels/domain';
import { JobStepName } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

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

export function transcriptionPersistHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const existing = await deps.transcripts.findByRecordingId(ctx.recordingId);
    if (existing) {
      return { transcriptId: existing.id, skipped: true };
    }

    const transcription = await deps.jobSteps.findByJobIdAndStep(ctx.jobId, JobStepName.Transcription);
    const result = transcription?.result ?? {};
    const segments = asSegments(result.segments);
    const text = typeof result.text === 'string' ? result.text : segments.map((s) => s.text).join(' ');
    const durationMs = typeof result.durationMs === 'number' ? result.durationMs : null;
    const provider = typeof result.provider === 'string' ? result.provider : transcription?.provider;
    const providerJobId =
      typeof result.providerJobId === 'string' ? result.providerJobId : transcription?.providerJobId;

    const transcript = await deps.transcripts.save(
      deps.transcripts.create({
        recordingId: ctx.recordingId,
        language: 'en',
        provider: provider ?? null,
        providerJobId: providerJobId ?? null,
        status: 'completed',
        text,
        durationMs,
        rawResponse: null,
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

    const recording = await deps.recordings.findOneByOrFail({ id: ctx.recordingId });
    if (durationMs !== null) {
      recording.durationMs = durationMs;
      await deps.recordings.save(recording);
    }

    return { transcriptId: transcript.id };
  };
}
