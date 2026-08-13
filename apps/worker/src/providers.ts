import {
  OpenAICompatibleEmbeddingProvider,
  OpenAICompatibleLLMProvider,
  PyAIClient,
  PyAISpeechProvider,
  openAICompatibleConfigFromEnv,
  openAICompatibleEmbeddingConfigFromEnv,
} from '@mintreels/ai';
import type { EmbeddingProvider, LLMProvider, SpeechProvider, VectorStoreProvider } from '@mintreels/ai';
import {
  QdrantVectorStore,
  qdrantConfigFromEnv,
  qdrantTranscriptConfigFromEnv,
} from '@mintreels/ai/providers/qdrant';
import { FilestackStorageProvider } from '@mintreels/storage';
import type { StorageProvider } from '@mintreels/storage';
import { EnvKey } from '@mintreels/schema';

function requireProvider(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

export function createSpeechProvider(): SpeechProvider {
  const provider = requireProvider(EnvKey.AiProvider, 'pyai');
  if (provider !== 'pyai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return new PyAISpeechProvider(new PyAIClient());
}

export function createLLMProvider(): LLMProvider {
  const provider = requireProvider(EnvKey.LlmProvider, 'openai');
  if (provider === 'openai' || provider === 'nvidia') {
    return new OpenAICompatibleLLMProvider(openAICompatibleConfigFromEnv(provider));
  }
  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = requireProvider(EnvKey.EmbeddingProvider, 'openai');
  if (provider !== 'openai') {
    throw new Error(`Unsupported EMBEDDING_PROVIDER: ${provider}`);
  }
  return new OpenAICompatibleEmbeddingProvider(openAICompatibleEmbeddingConfigFromEnv());
}

export function createVectorStoreProvider(): VectorStoreProvider {
  const provider = requireProvider(EnvKey.VectorStoreProvider, 'qdrant');
  if (provider !== 'qdrant') {
    throw new Error(`Unsupported VECTOR_STORE_PROVIDER: ${provider}`);
  }
  return new QdrantVectorStore(qdrantConfigFromEnv());
}

export function createTranscriptVectorStoreProvider(): VectorStoreProvider {
  const provider = requireProvider(EnvKey.VectorStoreProvider, 'qdrant');
  if (provider !== 'qdrant') {
    throw new Error(`Unsupported VECTOR_STORE_PROVIDER: ${provider}`);
  }
  return new QdrantVectorStore(qdrantTranscriptConfigFromEnv());
}

export function createStorageProvider(): StorageProvider {
  const provider = requireProvider(EnvKey.StorageProvider, 'filestack');
  if (provider !== 'filestack') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  return new FilestackStorageProvider();
}
