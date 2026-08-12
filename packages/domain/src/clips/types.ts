export type ClipStatus = 'queued' | 'rendering' | 'ready' | 'failed';

export interface Clip {
  id: string;
  recordingId: string;
  hookId?: string;
  title: string;
  startMs: number;
  endMs: number;
  storageKey?: string;
  status: ClipStatus;
  burnSubtitles: boolean;
  createdAt: Date;
}

export interface CreateClipInput {
  recordingId: string;
  hookId?: string;
  title: string;
  startMs: number;
  endMs: number;
  burnSubtitles?: boolean;
}
