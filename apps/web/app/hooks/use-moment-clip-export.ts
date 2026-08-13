import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, type MomentCandidate } from '@/lib/api';
import type { ClipSummary, ClipVoiceover } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';

const POLL_MS = 5000;

function isInFlight(status: ClipSummary['status'] | undefined): boolean {
  return status === 'queued' || status === 'rendering';
}

export function useMomentClipExport(recordingId: number | undefined, moment: MomentCandidate) {
  const queryClient = useQueryClient();
  const [clip, setClip] = useState<ClipSummary | null>(null);
  const clipId = clip?.id;
  const inFlight = isInFlight(clip?.status);
  const needsVideoUrl = clip?.status === 'ready' && clipId != null && !clip.videoUrl;

  const clipQuery = useQuery({
    queryKey: queryKeys.clips.detail(clipId ?? 0),
    queryFn: () => api.getClip(clipId as number),
    enabled: recordingId != null && clipId != null && (inFlight || needsVideoUrl),
    refetchInterval: inFlight ? POLL_MS : false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!clipQuery.data) {
      return;
    }
    setClip(clipQuery.data);
    if (clipQuery.data.status === 'ready' || clipQuery.data.status === 'failed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
    }
  }, [clipQuery.data, queryClient]);

  const exportMutation = useMutation({
    mutationFn: async (voiceover: ClipVoiceover | null) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.createClip({
        recordingId,
        title: moment.title,
        startMs: moment.clipStartMs,
        endMs: moment.clipEndMs,
        ...(voiceover ? { voiceover } : {}),
      });
    },
    onSuccess: (created) => {
      setClip(created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.filters() });
    },
  });

  const canExport =
    recordingId != null && !inFlight && !(clip?.status === 'ready' && clipId != null) && !exportMutation.isPending;

  return {
    clip,
    exportClip: (voiceover: ClipVoiceover | null = null) => {
      exportMutation.mutate(voiceover);
    },
    isExporting: exportMutation.isPending,
    canExport,
    errorMessage:
      exportMutation.error instanceof Error ? exportMutation.error.message : undefined,
  };
}
