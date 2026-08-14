/** HTTPS-only share targets — never open javascript: or relative URLs. */
export function isShareableHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type SharePlatformId =
  | 'copy'
  | 'native'
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'instagram';

export type SharePlatform = {
  id: SharePlatformId;
  label: string;
  description?: string;
};

export const SHARE_PLATFORMS: readonly SharePlatform[] = [
  { id: 'copy', label: 'Copy link' },
  { id: 'x', label: 'X' },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Copies title, description & link — paste into your Facebook post',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Copies title, description & link — paste into the LinkedIn post',
  },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Copies title, description & link — paste in the app',
  },
] as const;

export function buildClipboardShareText(
  title: string,
  url: string,
  description?: string | null,
): string {
  const trimmedTitle = title.trim();
  const trimmedDescription = description?.trim() ?? '';
  const parts: string[] = [];
  if (trimmedTitle.length > 0) {
    parts.push(trimmedTitle);
  }
  if (trimmedDescription.length > 0) {
    parts.push(trimmedDescription);
  }
  parts.push(url);
  return parts.join('\n\n');
}

/** Title + description only (no URL) for intents that take url separately. */
export function buildShareCaption(title: string, description?: string | null): string {
  const shareTitle = title.trim() || 'Clip';
  const trimmedDescription = description?.trim() ?? '';
  if (!trimmedDescription) {
    return shareTitle;
  }
  return `${shareTitle}\n\n${trimmedDescription}`;
}

/**
 * Platforms that cannot prefill a post body (or lack OG scrape for CDN video).
 * We copy title + description + link first, then open the destination when an intent URL exists.
 */
export function platformRequiresPaste(platform: SharePlatformId): boolean {
  return platform === 'facebook' || platform === 'linkedin' || platform === 'instagram';
}

export function pasteStatusMessage(platform: SharePlatformId): string {
  switch (platform) {
    case 'facebook':
      return 'Copied — paste into your Facebook post';
    case 'linkedin':
      return 'Copied — paste into your LinkedIn post';
    case 'instagram':
      return 'Copied — paste in Instagram';
    default:
      return 'Copied — paste into your post';
  }
}

/** Build an intent URL for a platform. Returns null for copy / native / Instagram. */
export function buildShareIntentUrl(
  platform: SharePlatformId,
  url: string,
  title: string,
  description?: string | null,
): string | null {
  if (!isShareableHttpsUrl(url)) {
    return null;
  }

  const encodedUrl = encodeURIComponent(url);
  const fullPost = buildClipboardShareText(title, url, description);
  const encodedFullPost = encodeURIComponent(fullPost);
  const caption = buildShareCaption(title, description);
  const encodedCaption = encodeURIComponent(caption);
  // X caps visible text roughly; leave room for the attached URL.
  const encodedTweet = encodeURIComponent(caption.slice(0, 240));

  switch (platform) {
    case 'x':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTweet}`;
    case 'facebook':
      // Facebook sharer ignores quote/text query params for most apps; paste-first + URL only.
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'linkedin':
      // LinkedIn dropped query-param post prefills. share-offsite also fails to unfurl
      // raw CDN video URLs (no Open Graph HTML), so we open the composer only —
      // callers must copy title/description/link first for the user to paste.
      return 'https://www.linkedin.com/feed/?shareActive=true';
    case 'whatsapp':
      return `https://wa.me/?text=${encodedFullPost}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedCaption}`;
    default:
      return null;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text || typeof navigator === 'undefined') {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareNative(
  url: string,
  title: string,
  description?: string | null,
): Promise<boolean> {
  if (!canUseNativeShare() || !isShareableHttpsUrl(url)) {
    return false;
  }

  try {
    const shareTitle = title.trim() || 'Clip';
    const data: ShareData = { title: shareTitle, url };
    const textParts = [shareTitle, description?.trim()].filter(Boolean);
    if (textParts.length > 0) {
      data.text = textParts.join('\n\n');
    }
    await navigator.share(data);
    return true;
  } catch (error: unknown) {
    // User dismissed the sheet — not a failure worth surfacing.
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false;
    }
    return false;
  }
}

export function openShareIntent(url: string): void {
  if (!isShareableHttpsUrl(url)) {
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
