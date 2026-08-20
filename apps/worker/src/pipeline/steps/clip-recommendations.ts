import { computeClipBoundary, selectHooks, type SelectionCandidate } from '@mintreels/ai';
import { EmbeddingStatus, HookStatus } from '@mintreels/schema';
import { loadHookConfig } from '../config';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

/**
 * Dedup, diversity-rank, and derive clip boundaries for a recording's hooks (plan §16–§19).
 *
 * Runs after HOOK_EMBEDDINGS, so it reuses the vectors already stored in the vector index instead of
 * re-embedding (plan §32 cost control). Hooks whose embedding never completed simply skip similarity
 * grouping — they become their own cluster and are ranked by score alone.
 */
export function clipRecommendationsHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const hooks = await deps.hooks.listByRecordingId(ctx.recordingId);
    if (hooks.length === 0) {
      return { selected: 0, rejected: 0, skipped: true };
    }

    const config = await loadHookConfig(deps.systemSettings);

    // Reuse embeddings already in the vector store; missing vectors just can't be deduped.
    const embedded = hooks.filter((hook) => hook.embeddingStatus === EmbeddingStatus.Completed);
    const stored =
      embedded.length > 0
        ? await deps.vectorStore.fetch(embedded.map((hook) => String(hook.id)))
        : [];
    const vectorsById = new Map(stored.map((item) => [item.id, item.vector]));

    const candidates: SelectionCandidate[] = hooks.map((hook) => {
      const vector = vectorsById.get(String(hook.id));
      return {
        id: hook.id,
        score: hook.score,
        hookType: hook.hookType,
        ...(vector ? { vector } : {}),
      };
    });

    const { selectedIds } = selectHooks(candidates, {
      similarityThreshold: config.similarityThreshold,
      finalCount: config.finalCount,
    });
    const selected = new Set(selectedIds);

    const recording = await deps.recordings.findOneByOrFail({ id: ctx.recordingId });
    const segments = await deps.segments.listByRecordingId(ctx.recordingId);
    const transcriptStartMs = segments.length > 0 ? segments[0]!.startMs : null;
    const transcriptEndMs = segments.length > 0 ? segments[segments.length - 1]!.endMs : null;

    for (const hook of hooks) {
      if (selected.has(hook.id)) {
        hook.status = HookStatus.Selected;
        const boundary = computeClipBoundary(
          { startMs: hook.startMs, endMs: hook.endMs },
          {
            preRollMs: config.preRollMs,
            postRollMs: config.postRollMs,
            recordingDurationMs: recording.durationMs,
            transcriptStartMs,
            transcriptEndMs,
          },
        );
        hook.clipStartMs = boundary.clipStartMs;
        hook.clipEndMs = boundary.clipEndMs;
      } else {
        hook.status = HookStatus.Rejected;
        hook.clipStartMs = null;
        hook.clipEndMs = null;
      }
    }

    await deps.hooks.save(hooks);

    return { selected: selected.size, rejected: hooks.length - selected.size };
  };
}
