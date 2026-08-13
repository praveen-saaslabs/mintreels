import { buildSemanticWindows, transcriptWindowPointId } from '@mintreels/ai';
import type { TranscriptSegment } from '@mintreels/domain';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

function toDomainSegments(
  rows: Awaited<ReturnType<WorkerDeps['segments']['listByRecordingId']>>,
): TranscriptSegment[] {
  return rows.map((row) => {
    const segment: TranscriptSegment = {
      id: row.id,
      sequence: row.sequence,
      startMs: row.startMs,
      endMs: row.endMs,
      text: row.text,
    };
    if (row.speaker) {
      segment.speaker = row.speaker;
    }
    return segment;
  });
}

export function transcriptEmbeddingsHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const rows = await deps.segments.listByRecordingId(ctx.recordingId);
    const windows = buildSemanticWindows(toDomainSegments(rows));
    await deps.transcriptVectorStore.deleteByRecordingId(ctx.recordingId);
    if (windows.length === 0) {
      return { embedded: 0, skipped: true };
    }

    const vectors = await deps.embeddings.embed(windows.map((window) => window.text));
    await deps.transcriptVectorStore.upsert(
      windows.map((window, index) => {
        const vector = vectors[index];
        if (!vector) {
          throw new Error(`Missing embedding for transcript window ${String(window.index)}`);
        }
        return {
          id: transcriptWindowPointId(ctx.recordingId, window.startMs, window.endMs),
          vector,
          recordingId: ctx.recordingId,
          startMs: window.startMs,
          endMs: window.endMs,
        };
      }),
    );
    return { embedded: windows.length };
  };
}
