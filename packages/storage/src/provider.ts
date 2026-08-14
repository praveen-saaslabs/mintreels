export interface UploadInput {
  key: string;
  body: ReadableStream | Uint8Array | Buffer;
  contentType?: string;
}

export interface StoredObject {
  key: string;
  size?: number;
}

export interface CreateVideoThumbnailOptions {
  /** Seek into the source video, in milliseconds. */
  atMs?: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredObject>;
  download(key: string): Promise<ReadableStream>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  /** Derive a still image from an uploaded video; key is a Filestack CDN URL. */
  createVideoThumbnail(
    sourceKey: string,
    options?: CreateVideoThumbnailOptions,
  ): Promise<StoredObject>;
}
