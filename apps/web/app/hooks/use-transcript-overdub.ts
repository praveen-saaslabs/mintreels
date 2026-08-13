import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { queryKeys } from '@/lib/query-keys';
import { useEditorStore } from '@/stores/editor-store';

const POLL_MS = 3000;

export function useTranscriptOverdub(recordingId: number | undefined) {
  const queryClient = useQueryClient();
  const patchSegmentText = useEditorStore((state) => state.patchSegmentText);
  const setSrc = useEditorStore((state) => state.setSrc);

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
    if (overdubQuery.data?.status !== 'success' || recordingId == null) {
      return;
    }
    void (async () => {
      const recording = await api.getRecording(recordingId);
      if (recording.videoUrl && isHttpsFilestackPlaybackUrl(recording.videoUrl)) {
        setSrc(recording.videoUrl);
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.detail(recordingId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.processing(recordingId),
      });
    })();
  }, [overdubQuery.data?.status, recordingId, queryClient, setSrc]);

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
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.recordings.detail(recordingId ?? 0), 'overdub'],
      });
    },
  });

  const inFlight =
    overdubQuery.data?.status === 'queued' || overdubQuery.data?.status === 'running';

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
    applyError: applyMutation.error instanceof Error ? applyMutation.error.message : undefined,
  };
}
