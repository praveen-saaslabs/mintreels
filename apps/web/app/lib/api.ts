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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE}${normalized}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${String(response.status)}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getRecordings: () => request<unknown>('/recordings'),
  getRecording: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}`),
  createRecording: (body: { title: string; originalFilename: string; url: string }) =>
    request<{ id: number; projectId: number; jobId: number }>('/recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  getTranscript: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getRecordingProcessing: (id: number) =>
    request<unknown>(`/recordings/${encodeURIComponent(id)}/processing`),
  getSummary: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: number) => request<unknown>(`/recordings/${encodeURIComponent(id)}/hooks`),
  getKnowledgeBases: () => request<unknown>('/knowledge-bases'),
  getClip: (id: number) => request<unknown>(`/clips/${encodeURIComponent(id)}`),

  getWorkspaceUser: () => request<WorkspaceUser>('/workspace/user'),
  getWorkspaceStats: () => request<WorkspaceStats>('/workspace/stats'),
  getProjects: () => request<ProjectSummary[]>('/projects'),
  getSidebarProjects: () => request<SidebarProject[]>('/projects/sidebar'),
  getClipFilters: () => request<ClipFilter[]>('/clips/filters'),
  getClips: () => request<ClipSummary[]>('/clips'),
  getSettings: () => request<SettingsSnapshot>('/settings'),
};
