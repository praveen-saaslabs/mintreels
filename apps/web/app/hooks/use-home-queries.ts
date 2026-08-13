import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useWorkspaceUserQuery() {
  return useQuery({
    queryKey: queryKeys.workspace.user(),
    queryFn: () => api.getWorkspaceUser(),
  });
}

export function useWorkspaceStatsQuery() {
  return useQuery({
    queryKey: queryKeys.workspace.stats(),
    queryFn: () => api.getWorkspaceStats(),
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => api.getProjects(),
  });
}

export function useSidebarProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects.sidebar(),
    queryFn: () => api.getSidebarProjects(),
  });
}

export function useClipsQuery() {
  return useQuery({
    queryKey: queryKeys.clips.list(),
    queryFn: () => api.getClips(),
  });
}

export function useClipFiltersQuery() {
  return useQuery({
    queryKey: queryKeys.clips.filters(),
    queryFn: () => api.getClipFilters(),
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.snapshot(),
    queryFn: () => api.getSettings(),
  });
}
