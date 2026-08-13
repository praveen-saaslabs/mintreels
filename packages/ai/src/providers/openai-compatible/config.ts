import { EnvKey } from '@mintreels/schema';

export type OpenAICompatibleProviderId = 'openai' | 'nvidia';

export type OpenAICompatibleLLMConfig = {
  provider: OpenAICompatibleProviderId;
  apiKey: string;
  baseURL?: string;
  model: string;
};

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';

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
