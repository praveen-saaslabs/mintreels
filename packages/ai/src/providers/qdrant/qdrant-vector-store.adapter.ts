import { QdrantClient } from '@qdrant/js-client-rest';
import { EnvKey } from '@mintreels/schema';
import { ProviderError } from '../../provider-error';
import type {
  VectorItem,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStoreProvider,
} from '../../vector-store-provider';

const PROVIDER = 'qdrant';
const DEFAULT_URL = 'http://localhost:6333';
const DEFAULT_COLLECTION = 'hook_vectors';

export type QdrantVectorStoreConfig = {
  url: string;
  apiKey?: string;
  collection?: string;
};

export function qdrantConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): QdrantVectorStoreConfig {
  const apiKey = env[EnvKey.QdrantApiKey]?.trim();
  const collection = env[EnvKey.QdrantCollection]?.trim();
  return {
    url: env[EnvKey.QdrantUrl]?.trim() || DEFAULT_URL,
    ...(apiKey ? { apiKey } : {}),
    ...(collection ? { collection } : {}),
  };
}

/** Payload mirrors the searchable/returnable fields; the vector itself is stored separately by Qdrant. */
type VectorPayload = {
  id: string;
  recording_id: number;
  start_ms: number;
  end_ms: number;
  hook_type: string;
  score: number;
};

function fail(code: string, error: unknown): ProviderError {
  return new ProviderError({
    provider: PROVIDER,
    code,
    message: error instanceof Error ? error.message : 'Qdrant call failed',
    retryable: false,
  });
}

function invalid(message: string): ProviderError {
  return new ProviderError({ provider: PROVIDER, code: 'invalid_request', message, retryable: false });
}

/** Hook ids are numeric primary keys; Qdrant point ids must be an unsigned int or a UUID. */
function toPointId(id: string): number {
  const value = Number(id);
  if (!Number.isInteger(value) || value < 0) {
    throw invalid(`Unsupported vector id: ${id}`);
  }
  return value;
}

function safeRecordingId(recordingId: number): number {
  if (!Number.isInteger(recordingId)) {
    throw invalid('recordingId must be an integer');
  }
  return recordingId;
}

function readNumber(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Vector index over hook vectors backed by a self-hosted Qdrant service. MySQL stays canonical —
 * this collection is derived and rebuildable from `hooks`.
 *
 * ponytail: the collection's vector size is pinned to the first upsert's embedding width. Changing
 * `EMBEDDING_MODEL` needs a rebuild (drop the collection), not a migration.
 */
export class QdrantVectorStore implements VectorStoreProvider {
  private readonly client: QdrantClient;
  private readonly collection: string;
  private ensured: Promise<void> | undefined;

  constructor(config: QdrantVectorStoreConfig) {
    this.client = new QdrantClient({
      url: config.url,
      ...(config.apiKey ? { apiKey: config.apiKey } : {}),
      // The client otherwise probes /healthz on construction, which fails against older servers.
      checkCompatibility: false,
    });
    this.collection = config.collection ?? DEFAULT_COLLECTION;
  }

  async upsert(items: VectorItem[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const points = items.map((item) => {
      if (item.vector.length === 0) {
        throw invalid(`Vector for ${item.id} is empty`);
      }
      const payload: VectorPayload = {
        id: item.id,
        recording_id: safeRecordingId(item.recordingId),
        start_ms: Math.trunc(item.startMs),
        end_ms: Math.trunc(item.endMs),
        hook_type: item.hookType ?? '',
        score: item.score ?? 0,
      };
      return { id: toPointId(item.id), vector: item.vector, payload };
    });
    try {
      await this.ensureCollection(points[0]!.vector.length);
      await this.client.upsert(this.collection, { wait: true, points });
    } catch (error) {
      throw fail('upsert_failed', error);
    }
  }

  async search(vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const recordingId = safeRecordingId(options.recordingId);
    if (!(await this.collectionExists())) {
      return [];
    }
    try {
      const response = await this.client.query(this.collection, {
        query: vector,
        limit: Math.max(1, Math.trunc(options.limit)),
        filter: { must: [{ key: 'recording_id', match: { value: recordingId } }] },
        with_payload: true,
      });
      return response.points
        // Qdrant returns cosine similarity directly (higher is closer), so no distance inversion.
        .filter((point) => point.score >= options.minimumSimilarity)
        .map((point) => this.toResult(point.score, (point.payload ?? {}) as Record<string, unknown>));
    } catch (error) {
      throw fail('search_failed', error);
    }
  }

  async fetch(ids: string[]): Promise<VectorItem[]> {
    if (ids.length === 0 || !(await this.collectionExists())) {
      return [];
    }
    try {
      const records = await this.client.retrieve(this.collection, {
        ids: ids.map(toPointId),
        with_vector: true,
        with_payload: true,
      });
      return records
        .map((record) => this.toItem(record.vector, (record.payload ?? {}) as Record<string, unknown>))
        .filter((item): item is VectorItem => item !== null);
    } catch (error) {
      throw fail('fetch_failed', error);
    }
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const points = ids.map(toPointId);
    if (!(await this.collectionExists())) {
      return;
    }
    try {
      await this.client.delete(this.collection, { wait: true, points });
    } catch (error) {
      throw fail('delete_failed', error);
    }
  }

  async deleteByRecordingId(recordingId: number): Promise<void> {
    const id = safeRecordingId(recordingId);
    if (!(await this.collectionExists())) {
      return;
    }
    try {
      await this.client.delete(this.collection, {
        wait: true,
        filter: { must: [{ key: 'recording_id', match: { value: id } }] },
      });
    } catch (error) {
      throw fail('delete_failed', error);
    }
  }

  async healthCheck(): Promise<void> {
    try {
      await this.client.getCollections();
    } catch (error) {
      throw fail('health_check_failed', error);
    }
  }

  private toResult(similarity: number, payload: Record<string, unknown>): VectorSearchResult {
    const hookType = readString(payload, 'hook_type');
    return {
      id: readString(payload, 'id'),
      similarity,
      recordingId: readNumber(payload, 'recording_id'),
      startMs: readNumber(payload, 'start_ms'),
      endMs: readNumber(payload, 'end_ms'),
      ...(hookType ? { hookType } : {}),
      score: readNumber(payload, 'score'),
    };
  }

  /** Rebuilds a `VectorItem` from a retrieved point; skips points without a numeric vector. */
  private toItem(vector: unknown, payload: Record<string, unknown>): VectorItem | null {
    if (!Array.isArray(vector) || vector.some((value) => typeof value !== 'number')) {
      return null;
    }
    const hookType = readString(payload, 'hook_type');
    return {
      id: readString(payload, 'id'),
      vector: vector as number[],
      recordingId: readNumber(payload, 'recording_id'),
      startMs: readNumber(payload, 'start_ms'),
      endMs: readNumber(payload, 'end_ms'),
      ...(hookType ? { hookType } : {}),
      score: readNumber(payload, 'score'),
    };
  }

  /** Reads and deletes are no-ops until the first upsert creates the collection. */
  private async collectionExists(): Promise<boolean> {
    try {
      const { collections } = await this.client.getCollections();
      return collections.some((entry) => entry.name === this.collection);
    } catch (error) {
      throw fail('open_collection_failed', error);
    }
  }

  /** Creates the collection lazily so its vector size is inferred from the first embedding width. */
  private ensureCollection(size: number): Promise<void> {
    this.ensured ??= (async () => {
      if (await this.collectionExists()) {
        return;
      }
      await this.client.createCollection(this.collection, {
        vectors: { size, distance: 'Cosine' },
      });
      // recording_id is the only filter key, so index it to keep scoped searches fast.
      await this.client.createPayloadIndex(this.collection, {
        field_name: 'recording_id',
        field_schema: 'integer',
      });
    })().catch((error: unknown) => {
      this.ensured = undefined;
      throw fail('ensure_collection_failed', error);
    });
    return this.ensured;
  }
}
