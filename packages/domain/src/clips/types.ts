export type ClipStatus = 'queued' | 'rendering' | 'ready' | 'failed';

export type ClipAspectRatio = '9:16' | '1:1' | '16:9';

/** Fit = full frame + blur pad. Fill = center crop. */
export type ClipFitMode = 'fit' | 'fill';

export interface Clip {
  id: number;
  recordingId: number;
  hookId?: number;
  title: string;
  startMs: number;
  endMs: number;
  aspectRatio: ClipAspectRatio;
  fitMode: ClipFitMode;
  storageKey?: string;
  thumbnailStorageKey?: string;
  status: ClipStatus;
  burnSubtitles: boolean;
  createdAt: Date;
}

export interface CreateClipInput {
  recordingId: number;
  hookId?: number;
  title: string;
  startMs: number;
  endMs: number;
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
}
