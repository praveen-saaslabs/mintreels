import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  api,
  type ExportRecordingRequest,
  type RecordingExportStatus,
  type RecordingSummary,
} from '@/lib/api';
import {
  clipDownloadFilename,
  downloadFilestackMedia,
  isHttpsFilestackPlaybackUrl,
} from '@/lib/filestack-playback';
import { queryKeys } from '@/lib/query-keys';
import {
  DEFAULT_EDITOR_ASPECT,
  DEFAULT_EDITOR_FIT_MODE,
  useEditorStore,
  type EditorAspectRatio,
} from '@/stores/editor-store';

const POLL_MS = 5000;

function isInFlightStatus(status: RecordingExportStatus | null | undefined): boolean {
  return status === 'queued' || status === 'rendering';
}

function needsExportUrl(recording: RecordingSummary | undefined): boolean {
  return recording?.exportStatus === 'ready' && !recording.exportVideoUrl;
}

export function useRecordingExport(recordingId: number | undefined, title: string) {
  const queryClient = useQueryClient();
  const playerAspect = useEditorStore((state) => state.playerAspect);
  const playerCaptionsOn = useEditorStore((state) => state.playerCaptionsOn);
  const [isDownloading, setIsDownloading] = useState(false);

  const recordingQuery = useQuery({
    queryKey: queryKeys.recordings.detail(recordingId ?? 0),
    queryFn: () => api.getRecording(recordingId as number),
    enabled: recordingId != null,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (isInFlightStatus(data?.exportStatus) || needsExportUrl(data)) {
        return POLL_MS;
      }
      return false;
    },
  });

  const recording = recordingQuery.data;
  const exportStatus = recording?.exportStatus ?? null;
  const inFlight = isInFlightStatus(exportStatus);
  const isFailed = exportStatus === 'failed';
  const exportVideoUrl = recording?.exportVideoUrl ?? null;
  const canDownload =
    exportStatus === 'ready' &&
    exportVideoUrl != null &&
    isHttpsFilestackPlaybackUrl(exportVideoUrl);
  const canCancel = inFlight;

  const exportMutation = useMutation({
    mutationFn: async (body: ExportRecordingRequest) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.exportRecording(recordingId, body);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.recordings.detail(data.id), data);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.cancelRecordingExport(recordingId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.recordings.detail(data.id), data);
    },
  });

  return {
    exportStatus,
    isFailed,
    exportVideoUrl,
    canDownload,
    canCancel,
    isExporting: exportMutation.isPending || inFlight,
    isCancelling: cancelMutation.isPending,
    isDownloading,
    playerAspect,
    playerCaptionsOn,
    errorMessage:
      exportMutation.error instanceof Error
        ? exportMutation.error.message
        : cancelMutation.error instanceof Error
          ? cancelMutation.error.message
          : undefined,
    startExport: (
      aspectRatio: EditorAspectRatio = playerAspect || DEFAULT_EDITOR_ASPECT,
      burnSubtitles: boolean = playerCaptionsOn,
      options?: { onSuccess?: () => void },
    ) => {
      exportMutation.mutate(
        {
          aspectRatio,
          fitMode: DEFAULT_EDITOR_FIT_MODE,
          burnSubtitles,
          force: true,
        },
        {
          onSuccess: () => {
            options?.onSuccess?.();
          },
        },
      );
    },
    cancelExport: (options?: { onSuccess?: () => void }) => {
      if (!canCancel || cancelMutation.isPending) {
        return;
      }
      cancelMutation.mutate(undefined, {
        onSuccess: () => {
          options?.onSuccess?.();
        },
      });
    },
    downloadExport: async () => {
      if (!canDownload || !exportVideoUrl || isDownloading) {
        return;
      }
      setIsDownloading(true);
      try {
        await downloadFilestackMedia(
          exportVideoUrl,
          clipDownloadFilename(title || recording?.title || 'export', recordingId),
        );
      } finally {
        setIsDownloading(false);
      }
    },
  };
}
