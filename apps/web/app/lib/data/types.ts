export type JobActivityStatus = 'running' | 'idle' | 'failed';

export type ClipRenderStatus = 'ready' | 'rendering' | 'queued' | 'failed';

export type ProviderConnectionStatus = 'connected' | 'not_set';

export type WorkspaceStats = {
  projectCount: number;
  recordingCount: number;
  clipCount: number;
};

export type SidebarProject = {
  id: string;
  name: string;
  recordingCount: number;
  accent: 'mint' | 'warn' | 'muted';
};

export type ProjectSummary = {
  id: string;
  name: string;
  updatedLabel: string;
  recordings: number;
  clips: number;
  hooks: number;
  kbLabel: string;
  jobStatus: JobActivityStatus;
  jobText: string;
};

export type ClipFilterId =
  | 'all'
  | 'ready'
  | 'rendering'
  | 'failed'
  | 'ratio_9_16'
  | 'subtitled';

export type ClipFilter = {
  id: ClipFilterId;
  label: string;
};

export type ClipSummary = {
  id: string;
  title: string;
  projectLabel: string;
  range: string;
  ratio: '9:16' | '1:1' | '16:9';
  duration: string;
  caption: string;
  status: ClipRenderStatus;
  subtitled: boolean;
};

export type ProviderRow = {
  id: string;
  label: string;
  envKey: string;
  /** Always masked / placeholder — never a real secret. */
  maskedKey: string;
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
