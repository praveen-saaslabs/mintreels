import { computeClipBoundary } from '@mintreels/ai';
import { JobStepStatus } from '@mintreels/schema';

export type SegmentSlice = {
  startMs: number;
  endMs: number;
  text: string;
};

export type MomentHit = {
  startMs: number;
  endMs: number;
  similarity: number;
};

export type MomentCandidateResult = {
  startMs: number;
  endMs: number;
  clipStartMs: number;
  clipEndMs: number;
  title: string;
  excerpt: string;
  similarity: number;
};

export function isTranscriptIndexReady(status: string | undefined): boolean {
  return status === JobStepStatus.Completed || status === JobStepStatus.Skipped;
}

export function excerptFromSegments(
  segments: readonly SegmentSlice[],
  startMs: number,
  endMs: number,
): string {
  return segments
    .filter((segment) => segment.endMs > startMs && segment.startMs < endMs)
    .map((segment) => segment.text.trim())
    .filter((text) => text.length > 0)
    .join(' ');
}

export function titleFromExcerpt(excerpt: string): string {
  const words = excerpt.trim().split(/\s+/).filter((word) => word.length > 0).slice(0, 8);
  const title = words.join(' ');
  return title.length > 0 ? title : 'Moment';
}

export function toMomentCandidates(
  hits: readonly MomentHit[],
  segments: readonly SegmentSlice[],
  options: {
    preRollMs: number;
    postRollMs: number;
    recordingDurationMs: number | null;
  },
): MomentCandidateResult[] {
  const transcriptStartMs = segments.length > 0 ? segments[0]!.startMs : null;
  const transcriptEndMs = segments.length > 0 ? segments[segments.length - 1]!.endMs : null;
  return hits.map((hit) => {
    const excerpt = excerptFromSegments(segments, hit.startMs, hit.endMs);
    const boundary = computeClipBoundary(
      { startMs: hit.startMs, endMs: hit.endMs },
      {
        preRollMs: options.preRollMs,
        postRollMs: options.postRollMs,
        recordingDurationMs: options.recordingDurationMs,
        transcriptStartMs,
        transcriptEndMs,
      },
    );
    return {
      startMs: hit.startMs,
      endMs: hit.endMs,
      clipStartMs: boundary.clipStartMs,
      clipEndMs: boundary.clipEndMs,
      title: titleFromExcerpt(excerpt),
      excerpt,
      similarity: hit.similarity,
    };
  });
}
