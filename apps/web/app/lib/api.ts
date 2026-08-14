import type {
  AuthUserResponse,
  LoginRequest,
  ResendVerificationRequest,
  SignupRequest,
  SignupResponse,
  VerifyEmailRequest,
} from '@mintreels/schema';
import type {
  ClipFilter,
  ClipSummary,
  ClipVoiceover,
  ClipVoiceoverPlacement,
  ProjectSummary,
  SettingsSnapshot,
  SidebarProject,
  WorkspaceStats,
  WorkspaceUser,
} from './data/types';

const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: unknown[];

  constructor(status: number, code: string, issues?: unknown[]) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (issues !== undefined) {
      this.issues = issues;
    }
  }
}

type ApiErrorBody = {
  error?: string;
  issues?: unknown[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${normalized}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as ApiErrorBody;
    throw new ApiError(
      response.status,
      typeof body.error === 'string' ? body.error : `HTTP_${String(response.status)}`,
      body.issues,
    );
  }

  return payload as T;
}

export type CreateRecordingRequest = {
  title: string;
  originalFilename: string;
  url: string;
};

export type CreateRecordingResponse = {
  id: number;
  projectId: number;
  jobId: number;
};

export type RecordingStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export type RecordingExportStatus = 'queued' | 'rendering' | 'ready' | 'failed';

export type RecordingSummary = {
  id: number;
  projectId: number;
  title: string;
  originalFilename: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  status: RecordingStatus;
  /** HTTPS Filestack CDN playback URL; never a storageKey field. */
  videoUrl: string | null;
  /** HTTPS Filestack CDN audio URL; null until extraction finishes. */
  audioUrl: string | null;
  /** HTTPS Filestack CDN poster; null until ingest thumbnail finishes. */
  thumbnailUrl: string | null;
  /** Latest full-video export status; null if never exported. */
  exportStatus: RecordingExportStatus | null;
  exportAspectRatio: '9:16' | '1:1' | '16:9' | null;
  exportFitMode: 'fit' | 'fill' | null;
  exportBurnSubtitles: boolean | null;
  /** HTTPS Filestack CDN URL for the exported MP4; never a storageKey. */
  exportVideoUrl: string | null;
  exportThumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingJobStatus = 'queued' | 'running' | 'success' | 'failed' | 'partial';

export type ProcessingStepStatus =
  'pending' | 'processing' | 'completed' | 'retrying' | 'failed' | 'skipped';

export type TranscriptResponse = {
  id: number;
  recordingId?: number;
  language: string | null;
  text: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  formats?: {
    srt?: string;
    vtt?: string;
  };
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    speaker?: string | null;
  }>;
  speakers: number;
  audio_seconds: number | null;
};

export type RecordingProcessingSnapshot = {
  recordingId: number;
  status: RecordingStatus;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  exportStatus: RecordingExportStatus | null;
  exportAspectRatio: '9:16' | '1:1' | '16:9' | null;
  exportFitMode: 'fit' | 'fill' | null;
  exportBurnSubtitles: boolean | null;
  exportVideoUrl: string | null;
  exportThumbnailUrl: string | null;
  job: {
    id: number;
    status: ProcessingJobStatus;
    currentStep: string | null;
    attempt: number;
    maxAttempts: number;
    errorCode: string | null;
    errorMessage: string | null;
  } | null;
  steps: Array<{
    step: string;
    status: ProcessingStepStatus;
    attempt: number;
    provider?: string;
  }>;
  transcript: TranscriptResponse | null;
  summary: { id: number; text: string } | null;
  actionItems: unknown[];
  hooks: Array<{
    id: number;
    title: string;
    hook: string;
    reason: string | null;
    startMs: number;
    endMs: number;
    score: number | null;
  }>;
  /** Chronological job audit trail for all jobs on this recording (ingest, export, hooks, …). */
  audit: Array<{
    jobId: number;
    event: string;
    step: string | null;
    message: string | null;
    createdAt: string;
  }>;
};

export type SummaryResponse = {
  id: number;
  recordingId: number;
  text: string;
  createdAt: string;
};

export type HookClipSummary = {
  id: number;
  status: ClipSummary['status'];
  videoUrl: string | null;
  thumbnailUrl: string | null;
};

export type HookResponse = {
  id: number;
  recordingId: number;
  title: string;
  hook: string;
  reason: string | null;
  startMs: number;
  endMs: number;
  score: number | null;
  createdAt: string;
  clip?: HookClipSummary | null;
};

export type MomentCandidate = {
  startMs: number;
  endMs: number;
  clipStartMs: number;
  clipEndMs: number;
  title: string;
  excerpt: string;
  similarity: number;
};

export type SearchMomentsResponse = {
  moments: MomentCandidate[];
};

export type AskMomentsResponse =
  | { kind: 'answer'; text: string }
  | { kind: 'moments'; moments: MomentCandidate[] }
  | { kind: 'reject'; text: string };

export type ClipAspectRatio = '9:16' | '1:1' | '16:9';

export type ClipFitMode = 'fit' | 'fill';

export type CreateClipRequest = {
  recordingId: number;
  title: string;
  startMs: number;
  endMs: number;
  hookId?: number | null;
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
  subtitleStyle?: string | null;
  voiceover?: ClipVoiceover | null;
};

export type ExportHookClipRequest = {
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
  subtitleStyle?: string | null;
  voiceover?: ClipVoiceover | null;
};

export type ExportRecordingRequest = {
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
  force?: boolean;
};

export type ExportRecordingResponse = RecordingSummary & {
  jobId: number | null;
};


export type VoiceOption = {
  id: string;
  name: string;
  description?: string;
  language?: string;
  previewUrl?: string;
};

export type OverdubJobSnapshot = {
  jobId: number | null;
  status: 'queued' | 'running' | 'success' | 'failed' | 'partial' | null;
  error?: string | null;
  segmentId?: number | null;
};

export type PatchTranscriptSegmentRequest = {
  text: string;
};

export type ApplyOverdubRequest = {
  voiceId: string;
};

export type ApplyRecordingVoiceoverRequest = {
  voiceId: string;
  titleText?: string;
  ctaText?: string;
  script?: string;
  placement: ClipVoiceoverPlacement;
};

export type RecordingVoiceoverJobSnapshot = {
  jobId: number | null;
  status: 'queued' | 'running' | 'success' | 'failed' | 'partial' | null;
  error?: string | null;
};

export const api = {
  getRecordings: () => request<RecordingSummary[]>('/recordings'),
  getRecording: (id: number) => request<RecordingSummary>(`/recordings/${encodeURIComponent(id)}`),
  deleteRecording: (id: number) =>
    request<void>(`/recordings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createRecording: (body: CreateRecordingRequest) =>
    request<CreateRecordingResponse>('/recordings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  exportRecording: (id: number, body?: ExportRecordingRequest) =>
    request<ExportRecordingResponse>(`/recordings/${encodeURIComponent(id)}/export`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  cancelRecordingExport: (id: number) =>
    request<ExportRecordingResponse>(`/recordings/${encodeURIComponent(id)}/export/cancel`, {
      method: 'POST',
    }),
  getRecordingProcessing: (id: number) =>
    request<RecordingProcessingSnapshot>(`/recordings/${encodeURIComponent(id)}/processing`),
  retryRecording: (id: number) =>
    request<CreateRecordingResponse>(`/recordings/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    }),
  applyRecordingVoiceover: (id: number, body: ApplyRecordingVoiceoverRequest) =>
    request<{ jobId: number; status: string; voiceId: string; placement: string }>(
      `/recordings/${encodeURIComponent(id)}/voiceover`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getRecordingVoiceover: (id: number) =>
    request<RecordingVoiceoverJobSnapshot>(
      `/recordings/${encodeURIComponent(id)}/voiceover`,
    ),
  getTranscript: (id: number) =>
    request<TranscriptResponse>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getSummary: (id: number) =>
    request<SummaryResponse>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: number) =>
    request<HookResponse[]>(`/recordings/${encodeURIComponent(id)}/hooks`),
  searchMoments: (id: number, body: { query: string; limit?: number }) =>
    request<SearchMomentsResponse>(`/recordings/${encodeURIComponent(id)}/moments/search`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  askMoments: (id: number, body: { query: string; limit?: number }) =>
    request<AskMomentsResponse>(`/recordings/${encodeURIComponent(id)}/moments/ask`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  exportHookClip: (recordingId: number, hookId: number, body?: ExportHookClipRequest) =>
    request<ClipSummary>(
      `/recordings/${encodeURIComponent(recordingId)}/hooks/${encodeURIComponent(hookId)}/export`,
      {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      },
    ),
  createClip: (body: CreateClipRequest) =>
    request<ClipSummary>('/clips', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getVoices: () => request<VoiceOption[]>('/voices'),
  patchTranscriptSegment: (
    recordingId: number,
    segmentId: number,
    body: PatchTranscriptSegmentRequest,
  ) =>
    request<{ id: number; start: number; end: number; text: string; speaker?: string }>(
      `/recordings/${encodeURIComponent(recordingId)}/transcript/segments/${encodeURIComponent(segmentId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  applyTranscriptOverdub: (
    recordingId: number,
    segmentId: number,
    body: ApplyOverdubRequest,
  ) =>
    request<{ jobId: number; status: string; segmentId: number; voiceId: string }>(
      `/recordings/${encodeURIComponent(recordingId)}/transcript/segments/${encodeURIComponent(segmentId)}/overdub`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getTranscriptOverdub: (recordingId: number) =>
    request<OverdubJobSnapshot>(
      `/recordings/${encodeURIComponent(recordingId)}/transcript/overdub`,
    ),
  getKnowledgeBases: () => request<unknown>('/knowledge-bases'),
  getClip: (id: number) => request<ClipSummary>(`/clips/${encodeURIComponent(id)}`),
  generateClipSocialCopy: (id: number) =>
    request<ClipSummary>(`/clips/${encodeURIComponent(id)}/social-copy`, {
      method: 'POST',
    }),
  deleteClip: (id: number) =>
    request<void>(`/clips/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getWorkspaceUser: () => request<WorkspaceUser>('/workspace/user'),
  getWorkspaceStats: () => request<WorkspaceStats>('/workspace/stats'),
  getProjects: () => request<ProjectSummary[]>('/projects'),
  deleteProject: (id: number) =>
    request<void>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getSidebarProjects: () => request<SidebarProject[]>('/projects/sidebar'),
  getClipFilters: () => request<ClipFilter[]>('/clips/filters'),
  getClips: () => request<ClipSummary[]>('/clips'),
  getSettings: () => request<SettingsSnapshot>('/settings'),

  signup: (body: SignupRequest) =>
    request<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: LoginRequest) =>
    request<AuthUserResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  verifyEmail: (body: VerifyEmailRequest) =>
    request<AuthUserResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resendVerification: (body: ResendVerificationRequest) =>
    request<SignupResponse>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),
  me: () => request<AuthUserResponse>('/auth/me'),
};
