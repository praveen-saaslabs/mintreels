import * as filestack from 'filestack-js';
import { useRef, useState, type ChangeEvent } from 'react';

export type FilestackUploadResult = {
  url: string;
  handle?: string;
  filename: string;
  mimetype?: string;
  size: number;
};

export type FileUploadState = {
  progress: number;
  loading: boolean;
  error: boolean;
  status: string;
  file: File | null;
  fileName: string;
  fileUrl: string;
  size: number;
  type: string;
  result?: FilestackUploadResult;
};

const INITIAL_STATE: FileUploadState = {
  progress: 0,
  loading: false,
  error: false,
  status: '',
  file: null,
  fileName: '',
  fileUrl: '',
  size: 0,
  type: '',
};

/** Common video containers MintReels ingest accepts via Filestack. */
const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
  'video/3gpp2',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.mkv',
  '.avi',
  '.m4v',
  '.mpeg',
  '.mpg',
  '.3gp',
]);

/** Shared client upload limit — UI copy and Filestack pre-checks must use this. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export type UseFileUploadOptions = {
  maxFileSize?: number;
  onUploadSuccess?: (state: FileUploadState) => void;
  onUploadError?: (error: Error) => void;
};

function getFilestackApiKey(): string {
  const key = import.meta.env.VITE_FILESTACK_API_KEY?.trim();
  if (!key) {
    throw new Error('Filestack is not configured. Set VITE_FILESTACK_API_KEY.');
  }
  return key;
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) {
    return '';
  }
  return name.slice(idx).toLowerCase();
}

function isAllowedVideo(file: File): boolean {
  if (file.type.startsWith('video/') || VIDEO_MIME_TYPES.has(file.type)) {
    return true;
  }
  // Some browsers leave type empty; fall back to extension.
  return VIDEO_EXTENSIONS.has(extensionOf(file.name));
}

function sanitizeFilename(name: string): string {
  const trimmed = name
    .trim()
    .replace(/[^\w\s.-]/g, '-')
    .replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : 'video.mp4';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return Number.isInteger(kb) ? `${String(kb)} KB` : `${kb.toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${String(mb)} MB` : `${mb.toFixed(1)} MB`;
  }
  const gb = bytes / (1024 * 1024 * 1024);
  return Number.isInteger(gb) ? `${String(gb)} GB` : `${gb.toFixed(1)} GB`;
}

/**
 * Browser Filestack upload with progress + video-only validation.
 * Adapted for MintReels (no cross-repo imports). API key from Vite env only.
 */
export function useFileUpload({
  maxFileSize = MAX_UPLOAD_BYTES,
  onUploadSuccess,
  onUploadError,
}: UseFileUploadOptions = {}) {
  const [uploadState, setUploadState] = useState<FileUploadState>(INITIAL_STATE);
  const clientRef = useRef<filestack.Client | null>(null);

  function getClient(): filestack.Client {
    if (!clientRef.current) {
      clientRef.current = filestack.init(getFilestackApiKey());
    }
    return clientRef.current;
  }

  const clearUploadState = () => {
    setUploadState(INITIAL_STATE);
  };

  const handleFileChange = async (
    event?: ChangeEvent<HTMLInputElement>,
    retry = false,
  ): Promise<boolean> => {
    let file: File | null = null;

    if (retry) {
      file = uploadState.file;
    } else if (event?.target?.files?.length) {
      file = event.target.files[0] ?? null;
    }

    if (event?.target) {
      event.target.value = '';
    }

    if (!file) {
      return false;
    }

    try {
      const sanitizedName = sanitizeFilename(file.name);
      file = new File([file], sanitizedName, { type: file.type });

      if (!isAllowedVideo(file)) {
        const err = new Error('Please choose a video file (MP4, MOV, WebM, MKV, or AVI).');
        setUploadState((prev) => ({
          ...prev,
          error: true,
          loading: false,
          status: err.message,
        }));
        onUploadError?.(err);
        return false;
      }

      if (file.size > maxFileSize) {
        const err = new Error(`File size exceeds the limit of ${formatFileSize(maxFileSize)}.`);
        setUploadState((prev) => ({
          ...prev,
          error: true,
          loading: false,
          status: err.message,
        }));
        onUploadError?.(err);
        return false;
      }

      if (file.size <= 0) {
        const err = new Error('The selected file is empty.');
        setUploadState((prev) => ({
          ...prev,
          error: true,
          loading: false,
          status: err.message,
        }));
        onUploadError?.(err);
        return false;
      }

      const fileDetails: FileUploadState = {
        type: file.type,
        fileName: file.name,
        size: file.size,
        file,
        error: false,
        status: 'Uploading…',
        loading: true,
        progress: 0,
        fileUrl: '',
      };

      setUploadState(fileDetails);

      const res = await getClient().upload(file, {
        onProgress: (evt) => {
          setUploadState((prev) => ({
            ...prev,
            loading: true,
            progress: evt.totalPercent,
          }));
        },
      });

      const url = typeof res.url === 'string' ? res.url : '';
      if (!url.startsWith('https://')) {
        throw new Error('Upload succeeded but returned an invalid URL.');
      }

      const uploadResult: FilestackUploadResult = {
        url,
        filename: file.name,
        size: file.size,
      };
      if (typeof res.handle === 'string') {
        uploadResult.handle = res.handle;
      }
      const mime = typeof res.mimetype === 'string' ? res.mimetype : file.type;
      if (mime) {
        uploadResult.mimetype = mime;
      }

      const nextState: FileUploadState = {
        ...fileDetails,
        progress: 100,
        loading: false,
        error: false,
        status: 'Upload complete',
        fileUrl: url,
        result: uploadResult,
      };

      setUploadState(nextState);
      onUploadSuccess?.(nextState);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setUploadState((prev) => {
        const { result: _cleared, ...rest } = prev;
        return {
          ...rest,
          fileUrl: '',
          progress: 0,
          error: true,
          loading: false,
          status: error.message || 'Upload failed',
        };
      });
      onUploadError?.(error);
      return false;
    }
  };

  return {
    uploadState,
    handleFileChange,
    clearUploadState,
  };
}

export const VIDEO_ACCEPT =
  'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,.mp4,.mov,.webm,.mkv,.avi,.m4v';
