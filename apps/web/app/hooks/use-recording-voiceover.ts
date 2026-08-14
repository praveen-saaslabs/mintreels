import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { ClipVoiceover } from '@/lib/data/types';
import { isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { queryKeys } from '@/lib/query-keys';
import { useEditorStore } from '@/stores/editor-store';

const POLL_MS = 3000;

function voiceoverApplyErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    if (error.code === 'VOICEOVER_IN_PROGRESS') {
      return 'A voiceover or voice edit is already running. Wait for it to finish, then try again.';
    }
    if (error.code === 'VIDEO_NOT_AVAILABLE') {
      return 'Video is not ready for voiceover yet.';
    }
    if (error.code === 'EMPTY_VOICEOVER_TEXT') {
      return 'Enter what Mint should say.';
    }
    return error.code;
  }
  return error instanceof Error ? error.message : undefined;
}

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

  const overdubQuery = useQuery({
    queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'overdub'] as const,
    queryFn: () => api.getTranscriptOverdub(recordingId as number),
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
        queryClient.setQueryData(
          queryKeys.recordings.forProject(recording.projectId),
          (current: typeof recording | null | undefined) =>
            current && current.id === recording.id
              ? { ...current, videoUrl: recording.videoUrl }
              : current,
        );
        queryClient.setQueryData(
          queryKeys.recordings.processing(recordingId),
          (current: { videoUrl?: string | null } | undefined) =>
            current ? { ...current, videoUrl: recording.videoUrl } : current,
        );
        setSrc(recording.videoUrl);
        seek(0);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.recordings.forProject(recording.projectId),
        }),
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
      const script = [voiceover.titleText, voiceover.ctaText]
        .map((part) => part?.trim() ?? '')
        .filter((part) => part.length > 0)
        .join('. ');
      return api.applyRecordingVoiceover(recordingId, {
        voiceId: voiceover.voiceId,
        placement: voiceover.placement,
        ...(script.length > 0 ? { script } : {}),
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

  const voiceoverInFlight =
    voiceoverQuery.data?.status === 'queued' || voiceoverQuery.data?.status === 'running';
  const overdubInFlight =
    overdubQuery.data?.status === 'queued' || overdubQuery.data?.status === 'running';
  const inFlight = voiceoverInFlight || overdubInFlight;

  return {
    status: voiceoverQuery.data?.status ?? null,
    error: voiceoverQuery.data?.error ?? null,
    inFlight,
    applyVoiceover: (voiceover: ClipVoiceover) => applyMutation.mutateAsync(voiceover),
    isApplying: applyMutation.isPending,
    applyError: voiceoverApplyErrorMessage(applyMutation.error),
  };
}
