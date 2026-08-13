import { Global, Module } from '@nestjs/common';
import type { EmbeddingProvider, LLMProvider, SpeechProvider, VectorStoreProvider } from '@mintreels/ai';
import type { KnowledgeBaseProvider } from '@mintreels/knowledge';
import type { QueueProvider } from '@mintreels/queue';
import type { StorageProvider } from '@mintreels/storage';
import {
  createEmbeddingProvider,
  createKnowledgeBaseProvider,
  createLLMProvider,
  createQueueProvider,
  createSpeechProvider,
  createStorageProvider,
  createTranscriptVectorStoreProvider,
  createVectorStoreProvider,
} from './factories';
import {
  EMBEDDING_PROVIDER,
  KB_PROVIDER,
  LLM_PROVIDER,
  QUEUE_PROVIDER,
  SPEECH_PROVIDER,
  STORAGE_PROVIDER,
  TRANSCRIPT_VECTOR_STORE_PROVIDER,
  VECTOR_STORE_PROVIDER,
} from './provider-tokens';

const NEST_PROBE_KEYS = new Set([
  'then',
  'onModuleInit',
  'onModuleDestroy',
  'onApplicationBootstrap',
  'onApplicationShutdown',
  'beforeApplicationShutdown',
]);

/** Defer provider construction until first method call so API can boot without Redis/S3/PyAI. */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      // Nest probes thenables and lifecycle hooks — must not construct the real provider.
      if (typeof prop === 'string' && NEST_PROBE_KEYS.has(prop)) {
        return undefined;
      }
      instance ??= factory();
      const value = Reflect.get(instance as object, prop, receiver);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

@Global()
@Module({
  providers: [
    {
      provide: SPEECH_PROVIDER,
      useFactory: (): SpeechProvider => lazy(createSpeechProvider),
    },
    {
      provide: LLM_PROVIDER,
      useFactory: (): LLMProvider => lazy(createLLMProvider),
    },
    {
      provide: KB_PROVIDER,
      useFactory: (): KnowledgeBaseProvider => lazy(createKnowledgeBaseProvider),
    },
    {
      provide: STORAGE_PROVIDER,
      useFactory: (): StorageProvider => lazy(createStorageProvider),
    },
    {
      provide: QUEUE_PROVIDER,
      useFactory: (): QueueProvider => lazy(createQueueProvider),
    },
    {
      provide: VECTOR_STORE_PROVIDER,
      useFactory: (): VectorStoreProvider => lazy(createVectorStoreProvider),
    },
    {
      provide: TRANSCRIPT_VECTOR_STORE_PROVIDER,
      useFactory: (): VectorStoreProvider => lazy(createTranscriptVectorStoreProvider),
    },
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (): EmbeddingProvider => lazy(createEmbeddingProvider),
    },
  ],
  exports: [
    SPEECH_PROVIDER,
    LLM_PROVIDER,
    KB_PROVIDER,
    STORAGE_PROVIDER,
    QUEUE_PROVIDER,
    VECTOR_STORE_PROVIDER,
    TRANSCRIPT_VECTOR_STORE_PROVIDER,
    EMBEDDING_PROVIDER,
  ],
})
export class ProvidersModule {}
