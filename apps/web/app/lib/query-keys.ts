export const queryKeys = {
  all: ['mintreels'] as const,

  auth: {
    all: () => [...queryKeys.all, 'auth'] as const,
    me: () => [...queryKeys.auth.all(), 'me'] as const,
  },

  workspace: {
    all: () => [...queryKeys.all, 'workspace'] as const,
    user: () => [...queryKeys.workspace.all(), 'user'] as const,
    stats: () => [...queryKeys.workspace.all(), 'stats'] as const,
  },

  projects: {
    all: () => [...queryKeys.all, 'projects'] as const,
    list: () => [...queryKeys.projects.all(), 'list'] as const,
    sidebar: () => [...queryKeys.projects.all(), 'sidebar'] as const,
  },

  clips: {
    all: () => [...queryKeys.all, 'clips'] as const,
    list: () => [...queryKeys.clips.all(), 'list'] as const,
    filters: () => [...queryKeys.clips.all(), 'filters'] as const,
    detail: (id: number) => [...queryKeys.clips.all(), 'detail', id] as const,
  },

  settings: {
    all: () => [...queryKeys.all, 'settings'] as const,
    snapshot: () => [...queryKeys.settings.all(), 'snapshot'] as const,
  },

  recordings: {
    all: () => [...queryKeys.all, 'recordings'] as const,
    list: () => [...queryKeys.recordings.all(), 'list'] as const,
    detail: (id: number) => [...queryKeys.recordings.all(), 'detail', id] as const,
    processing: (id: number) => [...queryKeys.recordings.all(), 'processing', id] as const,
    moments: (id: number, query: string) =>
      [...queryKeys.recordings.all(), 'moments', id, query] as const,
    forProject: (projectId: number) =>
      [...queryKeys.recordings.all(), 'forProject', projectId] as const,
  },

  knowledge: {
    all: () => [...queryKeys.all, 'knowledge'] as const,
    bases: () => [...queryKeys.knowledge.all(), 'bases'] as const,
  },
} as const;
