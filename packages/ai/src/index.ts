export type { SpeechProvider } from './speech-provider';
export type { ActionItem, HookGenerationOptions, LLMProvider, SocialCopyResult } from './llm-provider';
export {
  classifyTranscriptAsk,
  extractiveAnswer,
  funnyReject,
  heuristicTranscriptAsk,
  parseTranscriptAskResponse,
} from './transcript-ask';
export type { TranscriptAskIntent, TranscriptAskResult } from './transcript-ask';
export {
  buildSocialCopyUserPrompt,
  heuristicSocialCopy,
  parseSocialCopyResponse,
  SOCIAL_COPY_DESCRIPTION_MAX,
  SOCIAL_COPY_EXCERPT_MAX_CHARS,
  SOCIAL_COPY_PROMPT_VERSION,
  SOCIAL_COPY_TITLE_MAX,
} from './prompts/social-copy.prompt';
export type { SocialCopyContext } from './prompts/social-copy.prompt';
export type { EmbeddingProvider } from './embedding-provider';
export type {
  HookCandidate,
  HookDimensionScores,
  HookScoreDimension,
  HookScoreWeights,
} from './hook-candidates';
export type {
  VectorItem,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStoreProvider,
} from './vector-store-provider';
export { InMemoryVectorStore } from './in-memory-vector-store';
export { cosineSimilarity, selectHooks } from './hook-selection';
export type { SelectionCandidate, SelectionConfig, SelectionResult } from './hook-selection';
export { computeClipBoundary } from './clip-boundaries';
export type { ClipBoundary, ClipBoundaryHook, ClipBoundaryOptions } from './clip-boundaries';
export { buildSemanticWindows } from './semantic-windows';
export type { SemanticWindow } from './semantic-windows';
export { transcriptWindowPointId } from './transcript-window-id';
export { ProviderError, isProviderError, isRetryableProviderError } from './provider-error';
export {
  PyAIClient,
  PyAILLMProvider,
  PyAISpeechProvider,
  isRetryableTranscriptionJobError,
  mapPyAIError,
  mapJobToSubmission,
  mapResultToCanonical,
} from './providers/pyai';
export {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_NVIDIA_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  DEFAULT_OPENAI_MODEL,
  OpenAICompatibleEmbeddingProvider,
  OpenAICompatibleLLMProvider,
  openAICompatibleConfigFromEnv,
  openAICompatibleEmbeddingConfigFromEnv,
} from './providers/openai-compatible';
export type {
  OpenAICompatibleEmbeddingConfig,
  OpenAICompatibleLLMConfig,
  OpenAICompatibleProviderId,
} from './providers/openai-compatible';
