import type { WorkerDeps } from '../deps';
import { loadDomainTranscript } from './summary';
import type { StepHandler } from '../step-runner';

export function actionItemsHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const transcript = await loadDomainTranscript(deps, ctx.recordingId);
    const items = await deps.llm.generateActionItems(transcript);
    let summary = await deps.summaries.findByRecordingId(ctx.recordingId);
    if (summary) {
      summary.actionItems = items;
    } else {
      summary = deps.summaries.create({
        recordingId: ctx.recordingId,
        text: 'Summary pending.',
        actionItems: items,
        keyPoints: null,
      });
    }
    const saved = await deps.summaries.save(summary);
    return { summaryId: saved.id, count: items.length };
  };
}
