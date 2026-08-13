import { PyAIClient, PyAILLMProvider, PyAISpeechProvider } from '@mintreels/ai';
import type { EmbeddingProvider, LLMProvider, SpeechProvider } from '@mintreels/ai';
import { PyAIKnowledgeBaseProvider, PyAIKnowledgeClient } from '@mintreels/knowledge';
import type { KnowledgeBaseProvider } from '@mintreels/knowledge';
import { BullMQQueueProvider } from '@mintreels/queue';
import type { QueueProvider } from '@mintreels/queue';
import { FilestackStorageProvider } from '@mintreels/storage';
import type { StorageProvider } from '@mintreels/storage';

function requireProvider(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

export function createSpeechProvider(): SpeechProvider {
  const provider = requireProvider('AI_PROVIDER', 'pyai');
  if (provider !== 'pyai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return new PyAISpeechProvider(new PyAIClient());
}

export function createLLMProvider(): LLMProvider & EmbeddingProvider {
  const provider = requireProvider('AI_PROVIDER', 'pyai');
  if (provider !== 'pyai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return new PyAILLMProvider(new PyAIClient());
}

export function createKnowledgeBaseProvider(): KnowledgeBaseProvider {
  const provider = requireProvider('KNOWLEDGE_BASE_PROVIDER', 'pyai');
  if (provider !== 'pyai') {
    throw new Error(`Unsupported KNOWLEDGE_BASE_PROVIDER: ${provider}`);
  }
  return new PyAIKnowledgeBaseProvider(new PyAIKnowledgeClient());
}

export function createStorageProvider(): StorageProvider {
  const provider = requireProvider('STORAGE_PROVIDER', 'filestack');
  if (provider !== 'filestack') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  return new FilestackStorageProvider();
}

export function createQueueProvider(): QueueProvider {
  const provider = requireProvider('QUEUE_PROVIDER', 'bullmq');
  if (provider !== 'bullmq') {
    throw new Error(`Unsupported QUEUE_PROVIDER: ${provider}`);
  }
  return new BullMQQueueProvider();
}
