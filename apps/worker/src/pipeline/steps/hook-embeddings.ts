import type { Hook } from '@mintreels/db';
import { EmbeddingStatus } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

/** The hook line plus the transcript context it came from; the title is the fallback. */
function embeddingText(hook: Hook): string {
  const text = [hook.hook, hook.contextText ?? '']
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
  return text.length > 0 ? text : hook.title.trim();
}

export function hookEmbeddingsHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const hooks = await deps.hooks.listByRecordingId(ctx.recordingId);
    const pending = hooks.filter((hook) => hook.embeddingStatus !== EmbeddingStatus.Completed);
    if (pending.length === 0) {
      return { embedded: 0, skipped: hooks.length };
    }

    try {
      const vectors = await deps.embeddings.embed(pending.map(embeddingText));
      await deps.vectorStore.upsert(
        pending.map((hook, index) => {
          const vector = vectors[index];
          if (!vector) {
            throw new Error(`Missing embedding for hook ${String(hook.id)}`);
          }
          return {
            // Hook id keeps the upsert idempotent across re-runs.
            id: String(hook.id),
            vector,
            recordingId: hook.recordingId,
            startMs: hook.startMs,
            endMs: hook.endMs,
            ...(hook.hookType ? { hookType: hook.hookType } : {}),
            ...(hook.score !== null ? { score: hook.score } : {}),
          };
        }),
      );
      await deps.hooks.save(
        pending.map((hook) => {
          hook.embeddingStatus = EmbeddingStatus.Completed;
          return hook;
        }),
      );
    } catch (error) {
      await deps.hooks.save(
        pending.map((hook) => {
          hook.embeddingStatus = EmbeddingStatus.Failed;
          return hook;
        }),
      );
      throw error;
    }

    return { embedded: pending.length, skipped: hooks.length - pending.length };
  };
}
