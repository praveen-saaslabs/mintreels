import { createHmac } from 'node:crypto';
import type { StorageProvider, StoredObject, UploadInput } from './provider';
import { parseFilestackRef } from './filestack-url';

const STORE_URL = 'https://www.filestackapi.com/api/store/s3';
const FILE_API = 'https://www.filestackapi.com/api/file';
const POLICY_TTL_SEC = 3600;

interface FilestackConfig {
  apiKey: string;
  appSecret?: string;
}

function requireApiKey(): string {
  const value = process.env.FILESTACK_API_KEY;
  if (!value || value.trim() === '') {
    throw new Error('FILESTACK_API_KEY is required');
  }
  return value.trim();
}

function loadConfig(): FilestackConfig {
  const secret = process.env.FILESTACK_APP_SECRET?.trim();
  const config: FilestackConfig = { apiKey: requireApiKey() };
  if (secret) {
    config.appSecret = secret;
  }
  return config;
}

function encodePolicy(policy: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(policy), 'utf8').toString('base64url');
}

function signPolicy(policy: string, secret: string): string {
  return createHmac('sha256', secret).update(policy).digest('hex');
}

async function toUint8Array(body: UploadInput['body']): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    return body;
  }
  const buffer = await new Response(body as ReadableStream).arrayBuffer();
  return new Uint8Array(buffer);
}

function filenameFromKey(key: string): string {
  const base = key.replaceAll('\\', '/').split('/').pop() ?? 'upload.bin';
  if (base === '' || base === '.' || base.includes('..') || base.includes('\0')) {
    return 'upload.bin';
  }
  return base.replace(/[^\w.\-]+/g, '_');
}

export class FilestackStorageProvider implements StorageProvider {
  constructor(private readonly config: FilestackConfig = loadConfig()) {}

  private securityQuery(calls: string[]): string {
    const secret = this.config.appSecret;
    if (!secret) {
      return '';
    }
    const policy = encodePolicy({
      expiry: Math.floor(Date.now() / 1000) + POLICY_TTL_SEC,
      call: calls,
    });
    const signature = signPolicy(policy, secret);
    return `&policy=${encodeURIComponent(policy)}&signature=${encodeURIComponent(signature)}`;
  }

  private cdnUrl(handle: string, signed: boolean): string {
    const base = `https://cdn.filestackcontent.com/${handle}`;
    if (!signed || !this.config.appSecret) {
      return base;
    }
    const query = this.securityQuery(['read']).replace(/^&/, '?');
    return `${base}${query}`;
  }

  async upload(input: UploadInput): Promise<StoredObject> {
    const bytes = await toUint8Array(input.body);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const filename = filenameFromKey(input.key);
    const form = new FormData();
    form.set(
      'fileUpload',
      new Blob([copy], { type: input.contentType ?? 'application/octet-stream' }),
      filename,
    );

    const url = `${STORE_URL}?key=${encodeURIComponent(this.config.apiKey)}${this.securityQuery(['pick', 'store'])}`;
    const response = await fetch(url, { method: 'POST', body: form });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Filestack store failed (${String(response.status)})`);
    }
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Filestack store returned an invalid response');
    }
    const record = payload as Record<string, unknown>;
    const handle = typeof record.handle === 'string' ? record.handle : '';
    const returnedUrl = typeof record.url === 'string' ? record.url : '';
    const ref = parseFilestackRef(returnedUrl || handle);
    const size = typeof record.size === 'number' ? record.size : undefined;
    return size === undefined ? { key: ref.url } : { key: ref.url, size };
  }

  async download(key: string): Promise<ReadableStream> {
    const ref = parseFilestackRef(key);
    const response = await fetch(this.cdnUrl(ref.handle, true));
    if (!response.ok || !response.body) {
      throw new Error(`Object not found: ${ref.handle}`);
    }
    return response.body;
  }

  async getSignedUrl(key: string): Promise<string> {
    const ref = parseFilestackRef(key);
    return this.cdnUrl(ref.handle, true);
  }

  async delete(key: string): Promise<void> {
    const ref = parseFilestackRef(key);
    const url = `${FILE_API}/${ref.handle}?key=${encodeURIComponent(this.config.apiKey)}${this.securityQuery(['remove'])}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Filestack delete failed (${String(response.status)})`);
    }
  }
}
