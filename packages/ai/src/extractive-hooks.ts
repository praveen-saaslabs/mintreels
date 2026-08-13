import type { Hook, Transcript, TranscriptSegment } from '@mintreels/domain';

const MIN_HOOK_MS = 15_000;
const MAX_HOOK_MS = 90_000;
const EMPHASIS = /\b(really|never|always|must|wait|actually|insane|crazy|huge)\b/i;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function titleFromText(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 8);
  const title = words.join(' ');
  return title.length > 0 ? title : 'Hook';
}

function scoreWindow(text: string, durationMs: number): number {
  const lengthScore = clamp01(text.length / 400);
  const durationScore = clamp01(durationMs / MAX_HOOK_MS);
  let bonus = 0;
  if (text.includes('?')) bonus += 0.2;
  if (text.includes('!')) bonus += 0.15;
  if (EMPHASIS.test(text)) bonus += 0.1;
  return clamp01(lengthScore * 0.5 + durationScore * 0.2 + bonus);
}

function windowReason(text: string, durationMs: number): string {
  const bits: string[] = [`${Math.round(durationMs / 1000)}s window`];
  if (text.includes('?')) bits.push('question');
  if (text.includes('!')) bits.push('emphasis');
  if (EMPHASIS.test(text)) bits.push('strong wording');
  return bits.join(', ');
}

/** Heuristic hook windows — shared by PyAI extractive and OpenAI-compatible providers. */
export function generateExtractiveHooks(transcript: Transcript): Hook[] {
  const segments = transcript.segments;
  if (segments.length === 0) {
    return [];
  }
  const windows: { start: TranscriptSegment; end: TranscriptSegment; slice: TranscriptSegment[] }[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const start = segments[i];
    if (!start) continue;
    let j = i;
    while (j < segments.length) {
      const end = segments[j];
      if (!end) break;
      const duration = end.endMs - start.startMs;
      if (duration > MAX_HOOK_MS) break;
      j += 1;
    }
    const endIndex = Math.max(i, j - 1);
    const end = segments[endIndex];
    if (!end) continue;
    const duration = end.endMs - start.startMs;
    if (duration < MIN_HOOK_MS || duration > MAX_HOOK_MS) continue;
    windows.push({ start, end, slice: segments.slice(i, endIndex + 1) });
  }

  const scored = windows.map((window) => {
    const text = window.slice
      .map((segment) => segment.text.trim())
      .filter((part) => part.length > 0)
      .join(' ');
    const durationMs = window.end.endMs - window.start.startMs;
    return {
      title: titleFromText(text),
      rationale: windowReason(text, durationMs),
      startMs: window.start.startMs,
      endMs: window.end.endMs,
      score: scoreWindow(text, durationMs),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const top: Hook[] = [];
  for (const candidate of scored) {
    const key = `${String(candidate.startMs)}:${String(candidate.endMs)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    top.push({
      id: 0,
      recordingId: transcript.recordingId,
      title: candidate.title,
      rationale: candidate.rationale,
      startMs: candidate.startMs,
      endMs: candidate.endMs,
      score: candidate.score,
    });
    if (top.length >= 5) break;
  }
  return top;
}
