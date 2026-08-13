import type { Transcript, TranscriptSegment } from '@mintreels/domain';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

export async function loadDomainTranscript(
  deps: WorkerDeps,
  recordingId: number,
): Promise<Transcript> {
  const row = await deps.transcripts.findByRecordingId(recordingId);
  if (!row) {
    throw new Error('Transcript is required before analysis');
  }
  const rows = await deps.segments.listByRecordingId(recordingId);
  const segments: TranscriptSegment[] = rows.map((segment) => {
    const mapped: TranscriptSegment = {
      id: segment.id,
      sequence: segment.sequence,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
    };
    if (segment.speaker) {
      mapped.speaker = segment.speaker;
    }
    return mapped;
  });
  const transcript: Transcript = { id: row.id, recordingId, segments };
  if (row.language) {
    transcript.language = row.language;
  }
  return transcript;
}

export function summaryHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const transcript = await loadDomainTranscript(deps, ctx.recordingId);
    const summary = await deps.llm.summarize(transcript);
    let row = await deps.summaries.findByRecordingId(ctx.recordingId);
    if (row) {
      row.text = summary.text;
    } else {
      row = deps.summaries.create({
        recordingId: ctx.recordingId,
        text: summary.text,
        actionItems: null,
        keyPoints: null,
      });
    }
    const saved = await deps.summaries.save(row);
    return { summaryId: saved.id };
  };
}
