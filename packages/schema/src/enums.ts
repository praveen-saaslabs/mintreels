/** Canonical string values for DB rows and API responses. Import these instead of literals. */

export enum RecordingStatus {
  Uploaded = 'uploaded',
  Processing = 'processing',
  Ready = 'ready',
  Failed = 'failed',
}

export enum ClipStatus {
  Queued = 'queued',
  Rendering = 'rendering',
  Ready = 'ready',
  Failed = 'failed',
}

export enum JobStatus {
  Queued = 'queued',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Partial = 'partial',
}

export enum JobType {
  VideoIngest = 'VIDEO_INGEST',
  Transcribe = 'TRANSCRIBE',
  GenerateSummary = 'GENERATE_SUMMARY',
  SyncKnowledgeBase = 'SYNC_KNOWLEDGE_BASE',
  GenerateHooks = 'GENERATE_HOOKS',
  RenderClip = 'RENDER_CLIP',
  ApplyOverdub = 'APPLY_OVERDUB',
  ApplyRecordingVoiceover = 'APPLY_RECORDING_VOICEOVER',
  ExportRecording = 'EXPORT_RECORDING',
}

export enum KnowledgeBaseScope {
  Recording = 'recording',
  Global = 'global',
}

export enum JobActivityStatus {
  Running = 'running',
  Failed = 'failed',
  Idle = 'idle',
}

export enum SidebarAccent {
  Mint = 'mint',
  Warn = 'warn',
  Muted = 'muted',
}

export enum ClipRatio {
  Vertical = '9:16',
  Square = '1:1',
  Widescreen = '16:9',
}

/** Fit = full frame + pad (blur). Fill = center crop. */
export enum ClipFitMode {
  Fit = 'fit',
  Fill = 'fill',
}

export enum ClipFilterId {
  All = 'all',
  Queued = 'queued',
  Rendering = 'rendering',
  Ready = 'ready',
  Failed = 'failed',
}

export const CLIP_FILTER_LABELS: Record<ClipFilterId, string> = {
  [ClipFilterId.All]: 'All',
  [ClipFilterId.Queued]: 'Queued',
  [ClipFilterId.Rendering]: 'Rendering',
  [ClipFilterId.Ready]: 'Ready',
  [ClipFilterId.Failed]: 'Failed',
};

export enum ProviderConnectionStatus {
  Connected = 'connected',
  NotSet = 'not_set',
}

export enum SecretPresence {
  Configured = 'configured',
  NotConfigured = 'not configured',
}

export enum SettingsProviderId {
  Speech = 'speech',
  Llm = 'llm',
  Knowledge = 'kb',
  Storage = 'storage',
}

export enum JobStepName {
  AudioExtraction = 'AUDIO_EXTRACTION',
  AudioUpload = 'AUDIO_UPLOAD',
  Transcription = 'TRANSCRIPTION',
  TranscriptionPersist = 'TRANSCRIPTION_PERSIST',
  Summary = 'SUMMARY',
  ActionItems = 'ACTION_ITEMS',
  TranscriptEmbeddings = 'TRANSCRIPT_EMBEDDINGS',
  Hooks = 'HOOKS',
  HookEmbeddings = 'HOOK_EMBEDDINGS',
  ClipRecommendations = 'CLIP_RECOMMENDATIONS',
}

export const JOB_STEP_NAMES = [
  JobStepName.AudioExtraction,
  JobStepName.AudioUpload,
  JobStepName.Transcription,
  JobStepName.TranscriptionPersist,
  JobStepName.Summary,
  JobStepName.ActionItems,
  JobStepName.TranscriptEmbeddings,
  JobStepName.Hooks,
  JobStepName.HookEmbeddings,
  JobStepName.ClipRecommendations,
] as const;

export enum JobStepStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Retrying = 'retrying',
  Failed = 'failed',
  Skipped = 'skipped',
}

export enum HookType {
  Story = 'story',
  Lesson = 'lesson',
  Controversy = 'controversy',
  Surprise = 'surprise',
  Failure = 'failure',
  Success = 'success',
  Advice = 'advice',
  Emotion = 'emotion',
  Data = 'data',
  Quote = 'quote',
}

export enum HookStatus {
  Candidate = 'candidate',
  Selected = 'selected',
  Rejected = 'rejected',
}

export enum EmbeddingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum GuestSessionStatus {
  Active = 'active',
  Claimed = 'claimed',
  Expired = 'expired',
  Revoked = 'revoked',
}

export enum EnvKey {
  AiProvider = 'AI_PROVIDER',
  LlmProvider = 'LLM_PROVIDER',
  PyaiApiKey = 'PYAI_API_KEY',
  PyaiBaseUrl = 'PYAI_BASE_URL',
  OpenaiApiKey = 'OPENAI_API_KEY',
  OpenaiBaseUrl = 'OPENAI_BASE_URL',
  OpenaiModel = 'OPENAI_MODEL',
  NvidiaApiKey = 'NVIDIA_API_KEY',
  NvidiaBaseUrl = 'NVIDIA_BASE_URL',
  NvidiaModel = 'NVIDIA_MODEL',
  KnowledgeBaseProvider = 'KNOWLEDGE_BASE_PROVIDER',
  StorageProvider = 'STORAGE_PROVIDER',
  FilestackApiKey = 'FILESTACK_API_KEY',
  FilestackAppSecret = 'FILESTACK_APP_SECRET',
  WorkerConcurrency = 'WORKER_CONCURRENCY',
  JobMaxAttempts = 'JOB_MAX_ATTEMPTS',
  JobRetryBaseDelayMs = 'JOB_RETRY_BASE_DELAY_MS',
  JobStepStaleTimeoutMs = 'JOB_STEP_STALE_TIMEOUT_MS',
  EmbeddingProvider = 'EMBEDDING_PROVIDER',
  EmbeddingModel = 'EMBEDDING_MODEL',
  VectorStoreProvider = 'VECTOR_STORE_PROVIDER',
  QdrantUrl = 'QDRANT_URL',
  QdrantApiKey = 'QDRANT_API_KEY',
  QdrantCollection = 'QDRANT_COLLECTION',
  QdrantTranscriptCollection = 'QDRANT_TRANSCRIPT_COLLECTION',
  MomentSearchLimit = 'MOMENT_SEARCH_LIMIT',
  MomentSearchMinSimilarity = 'MOMENT_SEARCH_MIN_SIMILARITY',
  HookSimilarityThreshold = 'HOOK_SIMILARITY_THRESHOLD',
  HookMaxCandidates = 'HOOK_MAX_CANDIDATES',
  HookFinalCount = 'HOOK_FINAL_COUNT',
  ClipPrerollMs = 'CLIP_PREROLL_MS',
  ClipPostrollMs = 'CLIP_POSTROLL_MS',
  HookWeightQuality = 'HOOK_WEIGHT_QUALITY',
  HookWeightStandalone = 'HOOK_WEIGHT_STANDALONE',
  HookWeightCuriosity = 'HOOK_WEIGHT_CURIOSITY',
  HookWeightEmotional = 'HOOK_WEIGHT_EMOTIONAL',
  HookWeightSpecificity = 'HOOK_WEIGHT_SPECIFICITY',
  HookWeightShareability = 'HOOK_WEIGHT_SHAREABILITY',
  HookWeightNovelty = 'HOOK_WEIGHT_NOVELTY',
  HookWeightControversy = 'HOOK_WEIGHT_CONTROVERSY',
  HookWeightHeadline = 'HOOK_WEIGHT_HEADLINE',
  GuestEnabled = 'GUEST_ENABLED',
  GuestSessionTtlSeconds = 'GUEST_SESSION_TTL_SECONDS',
  GuestDataRetentionSeconds = 'GUEST_DATA_RETENTION_SECONDS',
  GuestMaxProjects = 'GUEST_MAX_PROJECTS',
  GuestMaxRecordings = 'GUEST_MAX_RECORDINGS',
  GuestRequestsPerMinute = 'GUEST_REQUESTS_PER_MINUTE',
  GuestUploadsPerHour = 'GUEST_UPLOADS_PER_HOUR',
  GuestTranscriptionsPerHour = 'GUEST_TRANSCRIPTIONS_PER_HOUR',
  GuestAiGenerationsPerHour = 'GUEST_AI_GENERATIONS_PER_HOUR',
  GuestSessionCreationsPerIpPerHour = 'GUEST_SESSION_CREATIONS_PER_IP_PER_HOUR',
}
