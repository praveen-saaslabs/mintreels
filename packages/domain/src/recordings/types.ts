export type RecordingStatus =
  | 'uploaded'
  | 'ingesting'
  | 'transcribing'
  | 'summarizing'
  | 'indexing'
  | 'generating_hooks'
  | 'ready'
  | 'failed';

export interface Recording {
  id: number;
  title: string;
  storageKey: string;
  durationMs?: number;
  status: RecordingStatus;
  knowledgeBaseId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecordingInput {
  title: string;
  storageKey: string;
}
