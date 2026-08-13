import type { StepHandler } from '../step-runner';

export function clipRecommendationsHandler(): StepHandler {
  return async () => ({
    skipped: true,
    reason: 'hooks already are clip windows',
  });
}
