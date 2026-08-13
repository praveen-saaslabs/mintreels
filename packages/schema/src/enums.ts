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
}

export enum JobType {
  VideoIngest = 'VIDEO_INGEST',
  Transcribe = 'TRANSCRIBE',
  GenerateSummary = 'GENERATE_SUMMARY',
  SyncKnowledgeBase = 'SYNC_KNOWLEDGE_BASE',
  GenerateHooks = 'GENERATE_HOOKS',
  RenderClip = 'RENDER_CLIP',
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

export enum ClipFilterId {
  All = 'all',
  Ready = 'ready',
  Rendering = 'rendering',
  Failed = 'failed',
  Ratio916 = 'ratio_9_16',
  Subtitled = 'subtitled',
}

export const CLIP_FILTER_LABELS: Record<ClipFilterId, string> = {
  [ClipFilterId.All]: 'All',
  [ClipFilterId.Ready]: 'Ready',
  [ClipFilterId.Rendering]: 'Rendering',
  [ClipFilterId.Failed]: 'Failed',
  [ClipFilterId.Ratio916]: '9:16',
  [ClipFilterId.Subtitled]: 'Subtitled',
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

export enum EnvKey {
  AiProvider = 'AI_PROVIDER',
  PyaiApiKey = 'PYAI_API_KEY',
  KnowledgeBaseProvider = 'KNOWLEDGE_BASE_PROVIDER',
  StorageProvider = 'STORAGE_PROVIDER',
  S3Bucket = 'S3_BUCKET',
  S3AccessKeyId = 'S3_ACCESS_KEY_ID',
  WorkerConcurrency = 'WORKER_CONCURRENCY',
}
