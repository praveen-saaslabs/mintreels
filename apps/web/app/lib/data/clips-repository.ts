import { api } from '@/lib/api';
import { mockClipFilters, mockClips } from './mocks/home-mocks';
import type { ClipFilter, ClipSummary } from './types';

export type ClipsRepository = {
  listFilters(): Promise<ClipFilter[]>;
  listClips(): Promise<ClipSummary[]>;
};

export function createMockClipsRepository(): ClipsRepository {
  return {
    async listFilters() {
      return mockClipFilters;
    },
    async listClips() {
      return mockClips;
    },
  };
}

export function createApiClipsRepository(): ClipsRepository {
  return {
    listFilters: () => api.getClipFilters(),
    listClips: () => api.getClips(),
  };
}

export function createClipsRepository(useMock: boolean): ClipsRepository {
  return useMock ? createMockClipsRepository() : createApiClipsRepository();
}
