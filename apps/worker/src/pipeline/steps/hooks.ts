import { EmbeddingStatus, HookStatus } from '@mintreels/schema';
import { loadHookConfig } from '../config';
import type { WorkerDeps } from '../deps';
import { loadDomainTranscript } from './summary';
import type { StepHandler } from '../step-runner';

export function hooksHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const existing = await deps.hooks.listByRecordingId(ctx.recordingId);
    if (existing.length > 0) {
      return { count: existing.length, skipped: true };
    }
    const config = loadHookConfig();
    const transcript = await loadDomainTranscript(deps, ctx.recordingId);
    const generated = await deps.llm.generateHooks(transcript, {
      weights: config.weights,
      maxCandidates: config.maxCandidates,
    });
    if (generated.length > 0) {
      await deps.hooks.save(
        generated.map((hook) =>
          deps.hooks.create({
            recordingId: ctx.recordingId,
            title: hook.title,
            hook: hook.hook ?? hook.title,
            reason: hook.rationale,
            startMs: hook.startMs,
            endMs: hook.endMs,
            score: hook.score ?? null,
            startSegmentId: hook.startSegmentId ?? null,
            endSegmentId: hook.endSegmentId ?? null,
            hookType: hook.hookType ?? null,
            contextText: hook.contextText ?? null,
            qualityScore: hook.dimensions?.quality ?? null,
            standaloneScore: hook.dimensions?.standalone ?? null,
            curiosityScore: hook.dimensions?.curiosity ?? null,
            emotionalScore: hook.dimensions?.emotional ?? null,
            specificityScore: hook.dimensions?.specificity ?? null,
            shareabilityScore: hook.dimensions?.shareability ?? null,
            noveltyScore: hook.dimensions?.novelty ?? null,
            status: HookStatus.Candidate,
            embeddingStatus: EmbeddingStatus.Pending,
            clipStartMs: null,
            clipEndMs: null,
            provider: hook.provider ?? null,
            model: hook.model ?? null,
            promptVersion: hook.promptVersion ?? null,
          }),
        ),
      );
    }
    return { count: generated.length };
  };
}
