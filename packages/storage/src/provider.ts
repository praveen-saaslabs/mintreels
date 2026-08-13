export interface UploadInput {
  key: string;
  body: ReadableStream | Uint8Array | Buffer;
  contentType?: string;
}

export interface StoredObject {
  key: string;
  size?: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredObject>;
  download(key: string): Promise<ReadableStream>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
