import type { WorkerDeps } from '../deps';
import { loadDomainTranscript } from './summary';
import type { StepHandler } from '../step-runner';

export function hooksHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const existing = await deps.hooks.listByRecordingId(ctx.recordingId);
    if (existing.length > 0) {
      return { count: existing.length, skipped: true };
    }
    const transcript = await loadDomainTranscript(deps, ctx.recordingId);
    const generated = await deps.llm.generateHooks(transcript);
    if (generated.length > 0) {
      await deps.hooks.save(
        generated.map((hook) =>
          deps.hooks.create({
            recordingId: ctx.recordingId,
            title: hook.title,
            hook: hook.title,
            reason: hook.rationale,
            startMs: hook.startMs,
            endMs: hook.endMs,
            score: hook.score ?? null,
          }),
        ),
      );
    }
    return { count: generated.length };
  };
}
