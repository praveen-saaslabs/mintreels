import OpenAI from 'openai';
import type { EmbeddingProvider } from '../../embedding-provider';
import { ProviderError } from '../../provider-error';
import type { OpenAICompatibleEmbeddingConfig } from './config';
import { mapOpenAICompatibleError } from './errors';

/** Inputs per request. The endpoint takes an array, so a hook never costs its own round trip. */
const BATCH_SIZE = 96;

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  private readonly client: OpenAI;

  constructor(config: OpenAICompatibleEmbeddingConfig) {
    this.provider = config.provider;
    this.model = config.model;
    this.dimensions = config.dimensions;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
      vectors.push(...(await this.embedBatch(texts.slice(offset, offset + BATCH_SIZE))));
    }
    return vectors;
  }

  private async embedBatch(batch: string[]): Promise<number[][]> {
    if (batch.some((text) => text.trim().length === 0)) {
      throw new ProviderError({
        provider: this.provider,
        code: 'invalid_request',
        message: 'Cannot embed empty text',
        retryable: false,
      });
    }

    let data: { index: number; embedding: number[] }[];
    try {
      const response = await this.client.embeddings.create({ model: this.model, input: batch });
      data = response.data;
    } catch (error) {
      throw mapOpenAICompatibleError(error, this.provider);
    }

    // `index` is authoritative; the endpoint does not promise response order.
    const vectors: (number[] | undefined)[] = new Array(batch.length).fill(undefined);
    for (const item of data) {
      if (item.index >= 0 && item.index < vectors.length) {
        vectors[item.index] = item.embedding;
      }
    }
    return vectors.map((vector) => {
      if (!vector || vector.length === 0) {
        throw new ProviderError({
          provider: this.provider,
          code: 'invalid_response',
          message: 'Embedding response was missing a vector',
          retryable: true,
        });
      }
      return vector;
    });
  }
}
