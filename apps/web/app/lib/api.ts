import { getJson } from './http';

export { ApiError } from './http';

export const api = {
  getRecordings: () => getJson<unknown>('/recordings'),
  getRecording: (id: number) => getJson<unknown>(`/recordings/${encodeURIComponent(id)}`),
  getTranscript: (id: number) => getJson<unknown>(`/recordings/${encodeURIComponent(id)}/transcript`),
  getSummary: (id: number) => getJson<unknown>(`/recordings/${encodeURIComponent(id)}/summary`),
  getHooks: (id: number) => getJson<unknown>(`/recordings/${encodeURIComponent(id)}/hooks`),
  getKnowledgeBases: () => getJson<unknown>('/knowledge-bases'),
  getClip: (id: number) => getJson<unknown>(`/clips/${encodeURIComponent(id)}`),
};
