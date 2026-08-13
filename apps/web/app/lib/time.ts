export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}:${pad2(minutes)}:${pad2(remainder)}`;
  }

  return `${String(minutes)}:${pad2(remainder)}`;
}

/** Finite, non-negative seconds. 0 is valid (e.g. currentTime at start). */
export function finiteSeconds(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

/** Finite duration usable as a media clock length (must be > 0). */
export function finiteDuration(value: number): number | undefined {
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}

/** Largest finite positive duration among candidates (NaN / Infinity / 0 ignored). */
export function maxClockDuration(...candidates: Array<number | null | undefined>): number {
  let max = 0;
  for (const candidate of candidates) {
    const duration = typeof candidate === 'number' ? finiteDuration(candidate) : undefined;
    if (duration !== undefined && duration > max) {
      max = duration;
    }
  }
  return max;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
