import { PyAIClient, PyAILLMProvider, PyAISpeechProvider } from '@mintreels/ai';
import type { LLMProvider, SpeechProvider } from '@mintreels/ai';
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
  const provider = requireProvider(EnvKey.AiProvider, 'pyai');
  if (provider !== 'pyai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return new PyAILLMProvider(new PyAIClient());
}

export function createStorageProvider(): StorageProvider {
  const provider = requireProvider(EnvKey.StorageProvider, 'filestack');
  if (provider !== 'filestack') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  return new FilestackStorageProvider();
}
