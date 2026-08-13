import { EnvKey } from '@mintreels/schema';

export type OpenAICompatibleProviderId = 'openai' | 'nvidia';

export type OpenAICompatibleLLMConfig = {
  provider: OpenAICompatibleProviderId;
  apiKey: string;
  baseURL?: string;
  model: string;
};

export type OpenAICompatibleEmbeddingConfig = {
  provider: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  dimensions: number;
};

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

const OPENAI_EMBEDDING_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

export function openAICompatibleConfigFromEnv(
  provider: OpenAICompatibleProviderId,
  env: NodeJS.ProcessEnv = process.env,
): OpenAICompatibleLLMConfig {
  if (provider === 'openai') {
    const apiKey = env[EnvKey.OpenaiApiKey]?.trim() ?? '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }
    const baseURL = env[EnvKey.OpenaiBaseUrl]?.trim();
    const model = env[EnvKey.OpenaiModel]?.trim() || DEFAULT_OPENAI_MODEL;
    return baseURL ? { provider, apiKey, baseURL, model } : { provider, apiKey, model };
  }

  const apiKey = env[EnvKey.NvidiaApiKey]?.trim() ?? '';
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is required when LLM_PROVIDER=nvidia');
  }
  const baseURL = env[EnvKey.NvidiaBaseUrl]?.trim() || DEFAULT_NVIDIA_BASE_URL;
  const model = env[EnvKey.NvidiaModel]?.trim() || DEFAULT_NVIDIA_MODEL;
  return { provider, apiKey, baseURL, model };
}

/**
 * Only the OpenAI embeddings endpoint is used: NVIDIA's requires an extra `input_type`
 * and PyAI has no embedding contract yet.
 */
export function openAICompatibleEmbeddingConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAICompatibleEmbeddingConfig {
  const apiKey = env[EnvKey.OpenaiApiKey]?.trim() ?? '';
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
  }
  const baseURL = env[EnvKey.OpenaiBaseUrl]?.trim();
  const model = env[EnvKey.EmbeddingModel]?.trim() || DEFAULT_OPENAI_EMBEDDING_MODEL;
  const dimensions = OPENAI_EMBEDDING_DIMENSIONS[model] ?? DEFAULT_EMBEDDING_DIMENSIONS;
  return baseURL
    ? { provider: 'openai', apiKey, baseURL, model, dimensions }
    : { provider: 'openai', apiKey, model, dimensions };
}
