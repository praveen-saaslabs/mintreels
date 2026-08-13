export type ClipCreateGuard = 'not_found' | 'video_unavailable' | 'invalid_range' | 'ok';

export function clipCreateGuard(
  recording: { storageKey: string } | null,
  startMs: number,
  endMs: number,
): ClipCreateGuard {
  if (!recording) {
    return 'not_found';
  }
  if (recording.storageKey.trim() === '') {
    return 'video_unavailable';
  }
  if (startMs >= endMs) {
    return 'invalid_range';
  }
  return 'ok';
}
