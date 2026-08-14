import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import { isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { queryKeys } from '@/lib/query-keys';
import { useEditorStore } from '@/stores/editor-store';

const POLL_MS = 3000;

function overdubApplyErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    if (error.code === 'VOICEOVER_IN_PROGRESS') {
      return 'A voiceover or voice edit is already running. Wait for it to finish, then try again.';
    }
    return error.code;
  }
  return error instanceof Error ? error.message : undefined;
}

export function useTranscriptOverdub(recordingId: number | undefined) {
  const queryClient = useQueryClient();
  const patchSegmentText = useEditorStore((state) => state.patchSegmentText);
  const setSrc = useEditorStore((state) => state.setSrc);
  const seek = useEditorStore((state) => state.seek);
  const segments = useEditorStore((state) => state.project?.result?.segments ?? []);
  const appliedJobIdRef = useRef<number | null>(null);
  /** Only refresh player after a job we saw in flight (not on cold load). */
  const sawInFlightRef = useRef(false);

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
    const status = overdubQuery.data?.status;
    if (status === 'queued' || status === 'running') {
      sawInFlightRef.current = true;
    }
  }, [overdubQuery.data?.status]);

  useEffect(() => {
    const snapshot = overdubQuery.data;
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

    const segmentStart =
      snapshot.segmentId != null
        ? segments.find((segment) => segment.id === snapshot.segmentId)?.start
        : undefined;

    void (async () => {
      const recording = await api.getRecording(recordingId);
      if (recording.videoUrl && isHttpsFilestackPlaybackUrl(recording.videoUrl)) {
        // Keep forProject/processing caches in sync so the editor playback effect
        // does not immediately clobber the new URL with a stale list entry.
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
        seek(typeof segmentStart === 'number' ? segmentStart : 0);
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
    overdubQuery.data?.status,
    overdubQuery.data?.jobId,
    overdubQuery.data?.segmentId,
    recordingId,
    queryClient,
    setSrc,
    seek,
    segments,
  ]);

  const patchMutation = useMutation({
    mutationFn: async (input: { segmentId: number; text: string }) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.patchTranscriptSegment(recordingId, input.segmentId, { text: input.text });
    },
    onSuccess: (segment) => {
      patchSegmentText(segment.id, segment.text);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (input: { segmentId: number; voiceId: string }) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.applyTranscriptOverdub(recordingId, input.segmentId, {
        voiceId: input.voiceId,
      });
    },
    onSuccess: () => {
      sawInFlightRef.current = true;
      appliedJobIdRef.current = null;
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'overdub'],
      });
    },
  });

  const overdubInFlight =
    overdubQuery.data?.status === 'queued' || overdubQuery.data?.status === 'running';
  const voiceoverInFlight =
    voiceoverQuery.data?.status === 'queued' || voiceoverQuery.data?.status === 'running';
  const inFlight = overdubInFlight || voiceoverInFlight;

  return {
    overdubStatus: overdubQuery.data?.status ?? null,
    overdubSegmentId: overdubQuery.data?.segmentId ?? null,
    overdubError: overdubQuery.data?.error ?? null,
    inFlight,
    saveSegmentText: (segmentId: number, text: string) =>
      patchMutation.mutateAsync({ segmentId, text }),
    applyOverdub: (segmentId: number, voiceId: string) =>
      applyMutation.mutateAsync({ segmentId, voiceId }),
    isSaving: patchMutation.isPending,
    isApplying: applyMutation.isPending,
    saveError: patchMutation.error instanceof Error ? patchMutation.error.message : undefined,
    applyError: overdubApplyErrorMessage(applyMutation.error),
  };
}
