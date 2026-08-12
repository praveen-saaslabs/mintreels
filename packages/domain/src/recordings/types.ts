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
  id: string;
  title: string;
  storageKey: string;
  durationMs?: number;
  status: RecordingStatus;
  knowledgeBaseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecordingInput {
  title: string;
  storageKey: string;
}
