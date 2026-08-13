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

export type RecordingSummary = {
  id: number;
  projectId: number;
  title: string;
  originalFilename: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  status: RecordingStatus;
  /** HTTPS Filestack CDN playback URL when available; never a storageKey field. */
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingJobStatus = 'queued' | 'running' | 'success' | 'failed' | 'partial';

export type ProcessingStepStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'skipped';

export type RecordingProcessingSnapshot = {
  recordingId: number;
  status: RecordingStatus;
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
  transcript: { id: number; language: string | null; segmentCount: number } | null;
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
};

export type TranscriptResponse = {
  id: number;
  recordingId: number;
  language: string | null;
  createdAt: string;
  segments: Array<{
    id: number;
    sequence: number;
    startMs: number;
    endMs: number;
    speaker: string | null;
    text: string;
  }>;
};

export type SummaryResponse = {
  id: number;
  recordingId: number;
  text: string;
  createdAt: string;
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
};

export const api = {
  getRecordings: () => request<RecordingSummary[]>('/recordings'),
  getRecording: (id: number) =>
    request<RecordingSummary>(`/recordings/${encodeURIComponent(id)}`),
  createRecording: (body: CreateRecordingRequest) =>
    request<CreateRecordingResponse>('/recordings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getRecordingProcessing: (id: number) =>
    request<RecordingProcessingSnapshot>(
      `/recordings/${encodeURIComponent(id)}/processing`,
    ),
  getTranscript: (id: number) =>
    request<TranscriptResponse>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getSummary: (id: number) =>
    request<SummaryResponse>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: number) =>
    request<HookResponse[]>(`/recordings/${encodeURIComponent(id)}/hooks`),
  getKnowledgeBases: () => request<unknown>('/knowledge-bases'),
  getClip: (id: number) => request<ClipSummary>(`/clips/${encodeURIComponent(id)}`),

  getWorkspaceUser: () => request<WorkspaceUser>('/workspace/user'),
  getWorkspaceStats: () => request<WorkspaceStats>('/workspace/stats'),
  getProjects: () => request<ProjectSummary[]>('/projects'),
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
