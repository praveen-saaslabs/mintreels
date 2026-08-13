export type VectorItem = {
  id: string;
  vector: number[];
  recordingId: number;
  startMs: number;
  endMs: number;
  hookType?: string;
  score?: number;
};

export type VectorSearchOptions = {
  recordingId: number;
  limit: number;
  minimumSimilarity: number;
};

export type VectorSearchResult = {
  id: string;
  similarity: number;
  recordingId: number;
  startMs: number;
  endMs: number;
  hookType?: string;
  score?: number;
};

export interface VectorStoreProvider {
  upsert(items: VectorItem[]): Promise<void>;
  search(vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  /** Return the stored vectors for the given ids (missing ids are omitted). Order is not guaranteed. */
  fetch(ids: string[]): Promise<VectorItem[]>;
  delete(ids: string[]): Promise<void>;
  deleteByRecordingId(recordingId: number): Promise<void>;
  healthCheck(): Promise<void>;
}
