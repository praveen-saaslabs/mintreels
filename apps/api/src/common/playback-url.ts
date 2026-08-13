import { parseFilestackRef } from '@mintreels/storage';

/** Filestack CDN URL for client playback — never expose the field name storageKey. */
export function publicPlaybackUrl(storageKey: string | null | undefined): string | null {
  if (typeof storageKey !== 'string' || storageKey.trim() === '') {
    return null;
  }
  try {
    return parseFilestackRef(storageKey).url;
  } catch {
    return null;
  }
}
