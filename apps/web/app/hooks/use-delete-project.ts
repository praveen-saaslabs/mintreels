import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import type { ClipSummary, ProjectSummary, SidebarProject, WorkspaceStats } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session expired. Sign in again, then retry.';
    }
    if (error.status === 404) {
      return 'Project not found.';
    }
    return error.code || 'Could not delete project.';
  }
  return error instanceof Error ? error.message : 'Could not delete project.';
}

export function useDeleteProject(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: (_data, id) => {
      const removed = queryClient
        .getQueryData<ProjectSummary[]>(queryKeys.projects.list())
        ?.find((project) => project.id === id);

      queryClient.setQueryData<ProjectSummary[]>(queryKeys.projects.list(), (projects) =>
        projects?.filter((project) => project.id !== id),
      );
      queryClient.setQueryData<SidebarProject[]>(queryKeys.projects.sidebar(), (projects) =>
        projects?.filter((project) => project.id !== id),
      );
      queryClient.setQueryData<ClipSummary[]>(queryKeys.clips.list(), (clips) =>
        clips?.filter((clip) => clip.projectId !== id),
      );
      queryClient.setQueryData<WorkspaceStats>(queryKeys.workspace.stats(), (stats) => {
        if (!stats) {
          return stats;
        }
        return {
          projectCount: Math.max(0, stats.projectCount - 1),
          recordingCount: Math.max(0, stats.recordingCount - (removed?.recordingCount ?? 0)),
          clipCount: Math.max(0, stats.clipCount - (removed?.clipCount ?? 0)),
        };
      });
      queryClient.removeQueries({ queryKey: queryKeys.recordings.forProject(id) });

      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace.stats() });
      options?.onSuccess?.();
    },
  });

  return {
    deleteProject: (id: number) => mutation.mutateAsync(id),
    isDeleting: mutation.isPending,
    errorMessage: mutation.error ? deleteErrorMessage(mutation.error) : undefined,
    reset: mutation.reset,
  };
}
