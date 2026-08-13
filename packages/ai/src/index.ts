export type { SpeechProvider } from './speech-provider';
export type {
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  Voice,
  VoiceAudioFormat,
  VoiceProvider,
} from './voice-provider';
export type { ActionItem, HookGenerationOptions, LLMProvider } from './llm-provider';
export {
  classifyTranscriptAsk,
  extractiveAnswer,
  funnyReject,
  heuristicTranscriptAsk,
  parseTranscriptAskResponse,
} from './transcript-ask';
export type { TranscriptAskIntent, TranscriptAskResult } from './transcript-ask';
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
  PyAIVoiceProvider,
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
