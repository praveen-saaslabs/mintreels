import type { Transcript, TranscriptSegment } from './types';

export function sortSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  return [...segments].sort((a, b) => a.sequence - b.sequence);
}

export function transcriptText(transcript: Transcript): string {
  return sortSegments(transcript.segments)
    .map((segment) => segment.text.trim())
    .filter((text) => text.length > 0)
    .join(' ');
}

export function durationMs(transcript: Transcript): number {
  const last = sortSegments(transcript.segments).at(-1);
  return last?.endMs ?? 0;
}
