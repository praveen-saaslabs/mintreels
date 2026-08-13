export {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_NVIDIA_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  DEFAULT_OPENAI_MODEL,
  openAICompatibleConfigFromEnv,
  openAICompatibleEmbeddingConfigFromEnv,
  type OpenAICompatibleEmbeddingConfig,
  type OpenAICompatibleLLMConfig,
  type OpenAICompatibleProviderId,
} from './config';
export { OpenAICompatibleEmbeddingProvider } from './embedding';
export { OpenAICompatibleLLMProvider } from './llm';
