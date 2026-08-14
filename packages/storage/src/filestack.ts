import { createHmac } from 'node:crypto';
import type { StorageProvider, StoredObject, UploadInput } from './provider';
import { parseFilestackRef } from './filestack-url';

const STORE_URL = 'https://www.filestackapi.com/api/store/s3';
const FILE_API = 'https://www.filestackapi.com/api/file';
const CDN_BASE = 'https://cdn.filestackcontent.com';
const POLICY_TTL_SEC = 3600;
const THUMBNAIL_TIMEOUT_MS = 60_000;
const THUMBNAIL_POLL_MS = 2000;

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

  private securityQuery(calls: string[], handle?: string): string {
    const secret = this.config.appSecret;
    if (!secret) {
      return '';
    }
    const body: Record<string, unknown> = {
      expiry: Math.floor(Date.now() / 1000) + POLICY_TTL_SEC,
      call: calls,
    };
    if (handle) {
      body.handle = handle;
    }
    const policy = encodePolicy(body);
    const signature = signPolicy(policy, secret);
    return `&policy=${encodeURIComponent(policy)}&signature=${encodeURIComponent(signature)}`;
  }

  private cdnUrl(handle: string, signed: boolean): string {
    const base = `${CDN_BASE}/${handle}`;
    if (!signed || !this.config.appSecret) {
      return base;
    }
    const query = this.securityQuery(['read']).replace(/^&/, '?');
    return `${base}${query}`;
  }

  async upload(input: UploadInput): Promise<StoredObject> {
    const bytes = await toUint8Array(input.body);
    const filename = filenameFromKey(input.key);
    const form = new FormData();
    form.set(
      'fileUpload',
      new Blob([bytes], { type: input.contentType ?? 'application/octet-stream' }),
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

  async createVideoThumbnail(sourceKey: string): Promise<StoredObject> {
    const ref = parseFilestackRef(sourceKey);
    const security = this.securityQuery(['convert', 'read']);
    const startUrl = `${CDN_BASE}/video_convert=preset:thumbnail,thumbnail_offset:1s/${ref.handle}?key=${encodeURIComponent(this.config.apiKey)}${security}`;
    const started = await fetchJsonObject(startUrl);
    let status = stringField(started, 'status');
    let data = asRecord(started.data);
    const uuid = stringField(started, 'uuid');

    const deadline = Date.now() + THUMBNAIL_TIMEOUT_MS;
    while (status !== 'completed' && status !== 'failed') {
      if (Date.now() > deadline) {
        throw new Error('Filestack thumbnail timed out');
      }
      if (uuid === '') {
        throw new Error('Filestack thumbnail job id missing');
      }
      await sleep(THUMBNAIL_POLL_MS);
      const statusQuery = security.replace(/^&/, '?');
      const statusUrl = `${CDN_BASE}/${encodeURIComponent(this.config.apiKey)}/video_status=uuid:${encodeURIComponent(uuid)}/${ref.handle}${statusQuery}`;
      const polled = await fetchJsonObject(statusUrl);
      status = stringField(polled, 'status');
      data = asRecord(polled.data);
    }

    if (status !== 'completed') {
      throw new Error('Filestack thumbnail failed');
    }
    const thumb = stringField(data, 'thumb');
    if (thumb === '') {
      throw new Error('Filestack thumbnail URL missing');
    }
    const stored = parseFilestackRef(thumb);
    return { key: stored.url };
  }

  async getSignedUrl(key: string): Promise<string> {
    const ref = parseFilestackRef(key);
    return this.cdnUrl(ref.handle, true);
  }

  async delete(key: string): Promise<void> {
    if (!this.config.appSecret) {
      throw new Error('Filestack delete requires FILESTACK_APP_SECRET');
    }
    const ref = parseFilestackRef(key);
    const url = `${FILE_API}/${ref.handle}?key=${encodeURIComponent(this.config.apiKey)}${this.securityQuery(['remove'], ref.handle)}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Filestack delete failed (${String(response.status)})`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

async function fetchJsonObject(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Filestack thumbnail request failed (${String(response.status)})`);
  }
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Filestack thumbnail returned an invalid response');
  }
  return payload as Record<string, unknown>;
}
