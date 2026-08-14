import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import type { ClipVoiceover } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';
import {
  DEFAULT_EDITOR_FIT_MODE,
  useEditorStore,
  type EditorAspectRatio,
  type EditorHook,
  type EditorHookStatus,
} from '@/stores/editor-store';

const POLL_MS = 5000;

function isInFlightStatus(status: EditorHookStatus): boolean {
  return status === 'queued' || status === 'rendering';
}

export function useHookClipExport(recordingId: number | undefined, hook: EditorHook) {
  const queryClient = useQueryClient();
  const patchHook = useEditorStore((state) => state.patchHook);
  const playerAspect = useEditorStore((state) => state.playerAspect);
  const playerCaptionsOn = useEditorStore((state) => state.playerCaptionsOn);
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
      ratio: clip.aspectRatio ?? clip.ratio ?? hook.ratio,
      ...(clip.videoUrl ? { clipVideoUrl: clip.videoUrl } : {}),
    });
    if (clip.status === 'ready' || clip.status === 'failed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
    }
  }, [clipQuery.data, hook.id, hook.ratio, patchHook, queryClient]);

  const exportMutation = useMutation({
    mutationFn: async ({
      aspectRatio,
      burnSubtitles,
      voiceover,
    }: {
      aspectRatio: EditorAspectRatio;
      burnSubtitles: boolean;
      voiceover?: ClipVoiceover | null;
    }) => {
      if (recordingId == null || !Number.isInteger(hookId) || hookId <= 0) {
        throw new Error('Invalid recording or hook');
      }
      return api.exportHookClip(recordingId, hookId, {
        aspectRatio,
        fitMode: DEFAULT_EDITOR_FIT_MODE,
        burnSubtitles,
        ...(voiceover ? { voiceover } : {}),
      });
    },
    onSuccess: (clip) => {
      patchHook(hook.id, {
        status: clip.status,
        clipId: clip.id,
        ratio: clip.aspectRatio ?? clip.ratio ?? playerAspect,
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
    exportClip: (
      aspectRatio: EditorAspectRatio = playerAspect,
      burnSubtitles: boolean = playerCaptionsOn,
      options?: { onSuccess?: () => void; voiceover?: ClipVoiceover | null },
    ) => {
      exportMutation.mutate(
        {
          aspectRatio,
          burnSubtitles,
          voiceover: options?.voiceover ?? null,
        },
        {
          onSuccess: () => {
            options?.onSuccess?.();
          },
        },
      );
    },
    isExporting: exportMutation.isPending,
    canExport,
    playerAspect,
    playerCaptionsOn,
    errorMessage:
      exportMutation.error instanceof Error ? exportMutation.error.message : undefined,
  };
}
