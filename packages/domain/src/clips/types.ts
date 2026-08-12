export type ClipStatus = 'queued' | 'rendering' | 'ready' | 'failed';

export interface Clip {
  id: number;
  recordingId: number;
  hookId?: number;
  title: string;
  startMs: number;
  endMs: number;
  storageKey?: string;
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
  burnSubtitles?: boolean;
}
