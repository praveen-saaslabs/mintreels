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

export const api = {
  getRecordings: () => request<unknown>('/recordings'),
  getRecording: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}`),
  getTranscript: (id: number) =>
    request<unknown>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getSummary: (id: number) =>
    request<unknown>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}/hooks`),
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
