import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useEditorStore, type EditorHook, type EditorHookStatus } from '@/stores/editor-store';

const POLL_MS = 5000;

function isInFlightStatus(status: EditorHookStatus): boolean {
  return status === 'queued' || status === 'rendering';
}

export function useHookClipExport(recordingId: number | undefined, hook: EditorHook) {
  const queryClient = useQueryClient();
  const patchHook = useEditorStore((state) => state.patchHook);
  const hookId = Number(hook.id);
  const clipId = hook.clipId;
  const inFlight = isInFlightStatus(hook.status);
  const needsVideoUrl = hook.status === 'ready' && clipId != null && !hook.clipVideoUrl;

  const clipQuery = useQuery({
    queryKey: queryKeys.clips.detail(clipId ?? 0),
    queryFn: () => api.getClip(clipId as number),
    enabled: recordingId != null && clipId != null && (inFlight || needsVideoUrl),
    refetchInterval: inFlight ? POLL_MS : false,
    staleTime: 0,
  });

  useEffect(() => {
    const clip = clipQuery.data;
    if (!clip) {
      return;
    }
    patchHook(hook.id, {
      status: clip.status,
      clipId: clip.id,
      ...(clip.videoUrl ? { clipVideoUrl: clip.videoUrl } : {}),
    });
    if (clip.status === 'ready' || clip.status === 'failed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
    }
  }, [clipQuery.data, hook.id, patchHook, queryClient]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (recordingId == null || !Number.isInteger(hookId) || hookId <= 0) {
        throw new Error('Invalid recording or hook');
      }
      return api.exportHookClip(recordingId, hookId);
    },
    onSuccess: (clip) => {
      patchHook(hook.id, {
        status: clip.status,
        clipId: clip.id,
        ...(clip.videoUrl ? { clipVideoUrl: clip.videoUrl } : {}),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
    },
  });

  const canExport =
    recordingId != null &&
    Number.isInteger(hookId) &&
    hookId > 0 &&
    !inFlight &&
    !(hook.status === 'ready' && clipId != null) &&
    !exportMutation.isPending;

  return {
    exportClip: () => {
      exportMutation.mutate();
    },
    isExporting: exportMutation.isPending,
    canExport,
    errorMessage:
      exportMutation.error instanceof Error ? exportMutation.error.message : undefined,
  };
}
