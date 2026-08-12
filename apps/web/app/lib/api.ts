const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE}${normalized}`, {
    ...init,
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
  getRecording: (id: string) => request<unknown>(`/recordings/${encodeURIComponent(id)}`),
  getTranscript: (id: string) => request<unknown>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getSummary: (id: string) => request<unknown>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: string) => request<unknown>(`/recordings/${encodeURIComponent(id)}/hooks`),
  getKnowledgeBases: () => request<unknown>('/knowledge-bases'),
  getClip: (id: string) => request<unknown>(`/clips/${encodeURIComponent(id)}`),
};
