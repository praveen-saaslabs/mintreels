import type { EditorHook } from '@/stores/editor-store';

/** Highest predicted retention first — same order as the Hooks sidebar. */
export function rankHooksByScore(hooks: readonly EditorHook[]): EditorHook[] {
  return [...hooks].sort(
    (a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY),
  );
}

export function hookSequenceLabel(index: number): string {
  return `H${String(index + 1)}`;
}

/** Sequential H1, H2, … keyed by hook id, matching sidebar rank. */
export function hookSequenceById(hooks: readonly EditorHook[]): Map<string, string> {
  return new Map(rankHooksByScore(hooks).map((hook, index) => [hook.id, hookSequenceLabel(index)]));
}
