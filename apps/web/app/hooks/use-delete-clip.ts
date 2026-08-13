import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import type { ClipFilter, ClipSummary, WorkspaceStats } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';

function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session expired. Sign in again, then retry.';
    }
    if (error.status === 404) {
      return 'Clip not found.';
    }
    return error.code || 'Could not delete clip.';
  }
  return error instanceof Error ? error.message : 'Could not delete clip.';
}

export function useDeleteClip() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: number) => api.deleteClip(id),
    onSuccess: (_data, id) => {
      const removed = queryClient
        .getQueryData<ClipSummary[]>(queryKeys.clips.list())
        ?.find((clip) => clip.id === id);

      queryClient.setQueryData<ClipSummary[]>(queryKeys.clips.list(), (clips) =>
        clips?.filter((clip) => clip.id !== id),
      );
      queryClient.setQueryData<ClipFilter[]>(queryKeys.clips.filters(), (filters) =>
        filters?.map((filter) => {
          if (filter.id === 'all' || (removed && filter.id === removed.status)) {
            return { ...filter, count: Math.max(0, filter.count - 1) };
          }
          return filter;
        }),
      );
      queryClient.removeQueries({ queryKey: queryKeys.clips.detail(id) });
      queryClient.setQueryData<WorkspaceStats>(queryKeys.workspace.stats(), (stats) =>
        stats ? { ...stats, clipCount: Math.max(0, stats.clipCount - 1) } : stats,
      );

      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace.stats() });
    },
  });

  return {
    deleteClip: (id: number) => mutation.mutateAsync(id),
    isDeleting: mutation.isPending,
    errorMessage: mutation.error ? deleteErrorMessage(mutation.error) : undefined,
    reset: mutation.reset,
  };
}
