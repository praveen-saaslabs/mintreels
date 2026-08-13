const HANDLE_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const CDN_HOST = 'cdn.filestackcontent.com';
const API_HOST = 'www.filestackapi.com';

export interface FilestackRef {
  handle: string;
  url: string;
}

export function isAudioFilename(filename: string): boolean {
  return /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(filename.trim());
}

export function parseFilestackRef(input: string): FilestackRef {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed.includes('..')) {
    throw new Error('Invalid Filestack URL');
  }

  if (HANDLE_PATTERN.test(trimmed)) {
    return { handle: trimmed, url: `https://${CDN_HOST}/${trimmed}` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid Filestack URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Invalid Filestack URL');
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter((part) => part.length > 0);

  if (host === CDN_HOST) {
    const handle = [...segments].reverse().find((part) => HANDLE_PATTERN.test(part));
    if (!handle) {
      throw new Error('Invalid Filestack URL');
    }
    return { handle, url: `https://${CDN_HOST}/${handle}` };
  }

  if (host === API_HOST && segments[0] === 'api' && segments[1] === 'file') {
    const handle = segments[2];
    if (!handle || !HANDLE_PATTERN.test(handle) || segments.length > 3) {
      throw new Error('Invalid Filestack URL');
    }
    return { handle, url: `https://${CDN_HOST}/${handle}` };
  }

  throw new Error('Invalid Filestack URL');
}
