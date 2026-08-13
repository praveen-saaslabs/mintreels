/**
 * Clip boundary derivation (plan §19).
 *
 * A hook window (`startMs`..`endMs`) is padded with configurable pre/post-roll to give the final clip
 * some lead-in and tail. Boundaries are clamped so the clip never runs past the recording or the
 * transcript extent, and integer milliseconds are preserved. Timestamps stay canonical — this only
 * widens an existing window, it never invents new ones.
 */

export interface ClipBoundaryHook {
  startMs: number;
  endMs: number;
}

export interface ClipBoundaryOptions {
  preRollMs: number;
  postRollMs: number;
  /** Recording duration in ms; when known the clip end is clamped to it. */
  recordingDurationMs?: number | null;
  /** Earliest transcript timestamp; the clip never starts before it. Defaults to 0. */
  transcriptStartMs?: number | null;
  /** Latest transcript timestamp; the clip never ends after it when no duration is known. */
  transcriptEndMs?: number | null;
}

export interface ClipBoundary {
  clipStartMs: number;
  clipEndMs: number;
}

/** Pad the hook window by pre/post-roll, clamped to recording and transcript bounds. */
export function computeClipBoundary(
  hook: ClipBoundaryHook,
  options: ClipBoundaryOptions,
): ClipBoundary {
  const preRoll = Math.max(0, Math.trunc(options.preRollMs));
  const postRoll = Math.max(0, Math.trunc(options.postRollMs));
  const startMs = Math.trunc(hook.startMs);
  const endMs = Math.trunc(hook.endMs);

  const lowerBound = Math.max(0, Math.trunc(options.transcriptStartMs ?? 0));

  const upperCandidates: number[] = [];
  if (options.recordingDurationMs != null) {
    upperCandidates.push(Math.trunc(options.recordingDurationMs));
  }
  if (options.transcriptEndMs != null) {
    upperCandidates.push(Math.trunc(options.transcriptEndMs));
  }
  const upperBound = upperCandidates.length > 0 ? Math.max(...upperCandidates) : Infinity;

  let clipStartMs = Math.max(lowerBound, startMs - preRoll);
  let clipEndMs = Math.min(upperBound, endMs + postRoll);

  // Degenerate inputs (bad bounds) must never produce an inverted window.
  clipStartMs = Math.min(clipStartMs, startMs);
  clipEndMs = Math.max(clipEndMs, endMs);

  return { clipStartMs, clipEndMs };
}
