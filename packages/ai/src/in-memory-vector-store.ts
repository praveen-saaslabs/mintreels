import type {
  VectorItem,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStoreProvider,
} from './vector-store-provider';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/** Test double for `VectorStoreProvider`: same semantics as Qdrant, no service or network. */
export class InMemoryVectorStore implements VectorStoreProvider {
  private readonly items = new Map<string, VectorItem>();

  async upsert(items: VectorItem[]): Promise<void> {
    for (const item of items) {
      this.items.set(item.id, { ...item, vector: [...item.vector] });
    }
  }

  async search(vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    return [...this.items.values()]
      .filter((item) => item.recordingId === options.recordingId)
      .map((item) => {
        const result: VectorSearchResult = {
          id: item.id,
          similarity: cosineSimilarity(vector, item.vector),
          recordingId: item.recordingId,
          startMs: item.startMs,
          endMs: item.endMs,
          ...(item.hookType !== undefined ? { hookType: item.hookType } : {}),
          ...(item.score !== undefined ? { score: item.score } : {}),
        };
        return result;
      })
      .filter((result) => result.similarity >= options.minimumSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, Math.max(0, Math.trunc(options.limit)));
  }

  async fetch(ids: string[]): Promise<VectorItem[]> {
    const found: VectorItem[] = [];
    for (const id of ids) {
      const item = this.items.get(id);
      if (item) {
        found.push({ ...item, vector: [...item.vector] });
      }
    }
    return found;
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.items.delete(id);
    }
  }

  async deleteByRecordingId(recordingId: number): Promise<void> {
    for (const [id, item] of this.items) {
      if (item.recordingId === recordingId) {
        this.items.delete(id);
      }
    }
  }

  async healthCheck(): Promise<void> {
    return undefined;
  }

  get size(): number {
    return this.items.size;
  }
}
