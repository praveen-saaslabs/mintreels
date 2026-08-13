const CDN_HOST = 'cdn.filestackcontent.com';
const API_HOST = 'www.filestackapi.com';

export function isHttpsFilestackPlaybackUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.hostname === CDN_HOST) {
      return parsed.pathname.length > 1;
    }
    if (parsed.hostname === API_HOST) {
      return /^\/api\/file\/[^/]+/.test(parsed.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

export function clipDownloadFilename(title: string, clipId?: number): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const base = slug.length > 0 ? slug : clipId != null ? `clip-${String(clipId)}` : 'clip';
  return `${base}.mp4`;
}

/** Download a Filestack HTTPS media URL. Never follows non-Filestack hosts. */
export async function downloadFilestackMedia(url: string, filename: string): Promise<void> {
  if (!isHttpsFilestackPlaybackUrl(url)) {
    throw new Error('Invalid download URL');
  }

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      throw new Error('Download failed');
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid download URL') {
      throw error;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
