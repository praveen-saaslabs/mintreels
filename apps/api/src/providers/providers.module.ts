import { Global, Module } from '@nestjs/common';
import type { EmbeddingProvider, LLMProvider, SpeechProvider } from '@mintreels/ai';
import type { KnowledgeBaseProvider } from '@mintreels/knowledge';
import type { QueueProvider } from '@mintreels/queue';
import type { StorageProvider } from '@mintreels/storage';
import {
  createKnowledgeBaseProvider,
  createLLMProvider,
  createQueueProvider,
  createSpeechProvider,
  createStorageProvider,
} from './factories';
import {
  KB_PROVIDER,
  LLM_PROVIDER,
  QUEUE_PROVIDER,
  SPEECH_PROVIDER,
  STORAGE_PROVIDER,
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
      useFactory: (): LLMProvider & EmbeddingProvider => lazy(createLLMProvider),
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
  ],
  exports: [SPEECH_PROVIDER, LLM_PROVIDER, KB_PROVIDER, STORAGE_PROVIDER, QUEUE_PROVIDER],
})
export class ProvidersModule {}
