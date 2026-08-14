import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { ClipVoiceover } from '@/lib/data/types';
import { isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { queryKeys } from '@/lib/query-keys';
import { useEditorStore } from '@/stores/editor-store';

const POLL_MS = 3000;

export function useRecordingVoiceover(recordingId: number | undefined) {
  const queryClient = useQueryClient();
  const setSrc = useEditorStore((state) => state.setSrc);
  const seek = useEditorStore((state) => state.seek);
  const appliedJobIdRef = useRef<number | null>(null);
  /** Only refresh player/transcript after a job we saw in flight (not on cold load). */
  const sawInFlightRef = useRef(false);

  const voiceoverQuery = useQuery({
    queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'voiceover'] as const,
    queryFn: () => api.getRecordingVoiceover(recordingId as number),
    enabled: recordingId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'queued' || status === 'running' ? POLL_MS : false;
    },
    staleTime: 0,
  });

  useEffect(() => {
    appliedJobIdRef.current = null;
    sawInFlightRef.current = false;
  }, [recordingId]);

  useEffect(() => {
    const status = voiceoverQuery.data?.status;
    if (status === 'queued' || status === 'running') {
      sawInFlightRef.current = true;
    }
  }, [voiceoverQuery.data?.status]);

  useEffect(() => {
    const snapshot = voiceoverQuery.data;
    if (
      snapshot?.status !== 'success' ||
      recordingId == null ||
      snapshot.jobId == null ||
      !sawInFlightRef.current
    ) {
      return;
    }
    if (appliedJobIdRef.current === snapshot.jobId) {
      return;
    }
    appliedJobIdRef.current = snapshot.jobId;
    sawInFlightRef.current = false;

    void (async () => {
      const recording = await api.getRecording(recordingId);
      if (recording.videoUrl && isHttpsFilestackPlaybackUrl(recording.videoUrl)) {
        setSrc(recording.videoUrl);
        seek(0);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.recordings.detail(recordingId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.recordings.processing(recordingId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.recordings.detail(recordingId), 'editor-bundle'],
        }),
      ]);
    })();
  }, [
    voiceoverQuery.data?.status,
    voiceoverQuery.data?.jobId,
    recordingId,
    queryClient,
    setSrc,
    seek,
  ]);

  const applyMutation = useMutation({
    mutationFn: async (voiceover: ClipVoiceover) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.applyRecordingVoiceover(recordingId, {
        voiceId: voiceover.voiceId,
        placement: voiceover.placement,
        ...(voiceover.titleText ? { titleText: voiceover.titleText } : {}),
        ...(voiceover.ctaText ? { ctaText: voiceover.ctaText } : {}),
      });
    },
    onSuccess: () => {
      sawInFlightRef.current = true;
      appliedJobIdRef.current = null;
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'voiceover'],
      });
    },
  });

  const inFlight =
    voiceoverQuery.data?.status === 'queued' || voiceoverQuery.data?.status === 'running';

  return {
    status: voiceoverQuery.data?.status ?? null,
    error: voiceoverQuery.data?.error ?? null,
    inFlight,
    applyVoiceover: (voiceover: ClipVoiceover) => applyMutation.mutateAsync(voiceover),
    isApplying: applyMutation.isPending,
    applyError: applyMutation.error instanceof Error ? applyMutation.error.message : undefined,
  };
}
