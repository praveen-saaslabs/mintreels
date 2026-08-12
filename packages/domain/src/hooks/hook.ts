import type { Hook } from './types';

export function hookDurationMs(hook: Hook): number {
  return Math.max(0, hook.endMs - hook.startMs);
}
