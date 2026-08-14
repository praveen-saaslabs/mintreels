export type JobActivityStatus = 'running' | 'idle' | 'failed';

export type ClipRenderStatus = 'ready' | 'rendering' | 'queued' | 'failed';

export type ProviderConnectionStatus = 'connected' | 'not_set';

export type KbScope = 'global' | 'recording' | null;

export type WorkspaceStats = {
  projectCount: number;
  recordingCount: number;
  clipCount: number;
};

export type SidebarProject = {
  id: number;
  name: string;
  recordingCount: number;
  accent: 'mint' | 'warn' | 'muted';
};

export type ProjectSummary = {
  id: number;
  name: string;
  updatedAt: string;
  recordingCount: number;
  clipCount: number;
  hookCount: number;
  kbScope: KbScope;
  jobStatus: JobActivityStatus;
  runningJobCount: number;
  failedJobCount: number;
  thumbnailUrl: string | null;
};

export type ClipFilterId = 'all' | 'queued' | 'rendering' | 'ready' | 'failed';

export type ClipFilter = {
  id: ClipFilterId;
  label: string;
  count: number;
};

export type ClipVoiceoverPlacement = 'pre' | 'duck';

export type ClipVoiceover = {
  enabled: boolean;
  voiceId: string;
  titleText?: string;
  ctaText?: string;
  placement: ClipVoiceoverPlacement;
};

export type ClipSummary = {
  id: number;
  title: string;
  socialTitle?: string | null;
  socialDescription?: string | null;
  recordingId: number;
  hookId: number | null;
  projectId: number;
  projectName: string;
  recordingTitle: string;
  startMs: number;
  endMs: number;
  status: ClipRenderStatus;
  aspectRatio?: '9:16' | '1:1' | '16:9';
  fitMode?: 'fit' | 'fill';
  burnSubtitles?: boolean;
  subtitleStyle: string | null;
  voiceover?: ClipVoiceover | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  /** Export target aspect (alias of aspectRatio). */
  ratio?: '9:16' | '1:1' | '16:9';
};

export type ProviderRow = {
  id: 'speech' | 'llm' | 'kb' | 'storage' | string;
  label: string;
  envKey: string;
  /** Only `"configured"` | `"not configured"` from the API. */
  maskedKey: 'configured' | 'not configured' | string;
  model: string;
  status: ProviderConnectionStatus;
};

export type RenderChoiceOption = {
  id: string;
  label: string;
};

export type RenderChoiceSetting = {
  id: string;
  kind: 'choice';
  label: string;
  help: string;
  options: RenderChoiceOption[];
  selectedId: string;
};

export type RenderToggleSetting = {
  id: string;
  kind: 'toggle';
  label: string;
  help: string;
  enabled: boolean;
};

export type RenderSetting = RenderChoiceSetting | RenderToggleSetting;

export type StorageJobsStats = {
  mediaOnDiskGb: number;
  workerConcurrency: number;
  failedJobsRetryable: number;
};

export type SettingsSnapshot = {
  providers: ProviderRow[];
  renderDefaults: RenderSetting[];
  storageJobs: StorageJobsStats;
};

export type WorkspaceUser = {
  initials: string;
  displayName: string;
  subtitle: string;
};
