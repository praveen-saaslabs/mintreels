import type { TranscriptSegment } from '@mintreels/domain';

export interface SemanticWindow {
  index: number;
  startSegmentId: number;
  endSegmentId: number;
  startMs: number;
  endMs: number;
  text: string;
}

const MIN_WINDOW_MS = 20_000;
const MAX_WINDOW_MS = 60_000;

function toWindow(index: number, slice: TranscriptSegment[]): SemanticWindow | null {
  const first = slice[0];
  const last = slice.at(-1);
  if (!first || !last) {
    return null;
  }
  return {
    index,
    startSegmentId: first.id,
    endSegmentId: last.id,
    startMs: first.startMs,
    endMs: last.endMs,
    text: slice
      .map((segment) => segment.text.trim())
      .filter((text) => text.length > 0)
      .join(' '),
  };
}

/**
 * Deterministic, segment-aligned analysis windows: each window is the shortest run of
 * consecutive segments that reaches 20s, never extended past 60s. The same transcript
 * always yields the same windows, and the LLM sees these blocks instead of every line.
 */
export function buildSemanticWindows(segments: readonly TranscriptSegment[]): SemanticWindow[] {
  const ordered = [...segments]
    .filter((segment) => segment.text.trim().length > 0)
    .sort((a, b) => a.sequence - b.sequence);

  const slices: TranscriptSegment[][] = [];
  let cursor = 0;
  while (cursor < ordered.length) {
    const start = ordered[cursor];
    if (!start) break;
    let end = cursor;
    while (end + 1 < ordered.length) {
      const current = ordered[end];
      const next = ordered[end + 1];
      if (!current || !next) break;
      if (current.endMs - start.startMs >= MIN_WINDOW_MS) break;
      if (next.endMs - start.startMs > MAX_WINDOW_MS) break;
      end += 1;
    }
    slices.push(ordered.slice(cursor, end + 1));
    cursor = end + 1;
  }

  const tail = slices.at(-1);
  const previous = slices.at(-2);
  if (tail && previous) {
    const tailStart = tail[0];
    const tailEnd = tail.at(-1);
    const previousStart = previous[0];
    if (
      tailStart &&
      tailEnd &&
      previousStart &&
      tailEnd.endMs - tailStart.startMs < MIN_WINDOW_MS &&
      tailEnd.endMs - previousStart.startMs <= MAX_WINDOW_MS
    ) {
      slices.splice(slices.length - 2, 2, [...previous, ...tail]);
    }
  }

  return slices.flatMap((slice, index) => {
    const window = toWindow(index, slice);
    return window ? [window] : [];
  });
}
