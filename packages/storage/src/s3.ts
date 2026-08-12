import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StoredObject, UploadInput } from './provider';

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function loadConfig(): S3Config {
  const endpoint = process.env.S3_ENDPOINT;
  const config: S3Config = {
    region: requireEnv('S3_REGION'),
    bucket: requireEnv('S3_BUCKET'),
    accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
  };

  if (endpoint && endpoint.trim() !== '') {
    config.endpoint = endpoint;
  }

  return config;
}

function assertKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed === '' || trimmed.includes('..') || trimmed.startsWith('/')) {
    throw new Error('Invalid storage key');
  }
  return trimmed;
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3Config = loadConfig()) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(input: UploadInput): Promise<StoredObject> {
    const key = assertKey(input.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ...(input.contentType ? { ContentType: input.contentType } : {}),
      }),
    );

    return { key, bucket: this.bucket };
  }

  async download(key: string): Promise<ReadableStream> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
      }),
    );

    const body = response.Body;
    if (!body) {
      throw new Error(`Object not found: ${key}`);
    }

    const webStream = body.transformToWebStream();
    return webStream;
  }

  async getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
      }),
      { expiresIn: 3600 },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
      }),
    );
  }
}
