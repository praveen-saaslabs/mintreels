import { ArrowLeft, Download, FileDown, Loader2, Mic2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipVoiceoverDialog } from '@/components/clips/clip-voiceover-dialog';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { CutClipConfirmDialog } from '@/components/summary/cut-clip-confirm-dialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useDeleteProject } from '@/hooks/use-delete-project';
import { useRecordingExport } from '@/hooks/use-recording-export';
import { useRecordingVoiceover } from '@/hooks/use-recording-voiceover';
import type { ClipVoiceover } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

export function EditorHeader({
  title,
  projectId,
  recordingId,
  voiceoverDefaultTitle,
}: Readonly<{
  title: string;
  projectId?: number | undefined;
  recordingId?: number | undefined;
  voiceoverDefaultTitle?: string | undefined;
}>) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const playerAspect = useEditorStore((state) => state.playerAspect);
  const playerCaptionsOn = useEditorStore((state) => state.playerCaptionsOn);
  const setPlayerAspect = useEditorStore((state) => state.setPlayerAspect);
  const setPlayerCaptionsOn = useEditorStore((state) => state.setPlayerCaptionsOn);

  const { deleteProject, isDeleting, errorMessage, reset } = useDeleteProject({
    onSuccess: () => {
      navigate('/');
    },
  });

  const {
    canDownload,
    canCancel,
    isExporting,
    isCancelling,
    isDownloading,
    isFailed,
    startExport,
    cancelExport,
    downloadExport,
    errorMessage: exportError,
  } = useRecordingExport(recordingId, title);

  const {
    applyVoiceover,
    isApplying,
    inFlight: voiceoverInFlight,
    status: voiceoverStatus,
    error: voiceoverError,
    applyError,
  } = useRecordingVoiceover(recordingId);

  const voiceoverBusy = isApplying || voiceoverInFlight;
  const canAddVoiceover = recordingId != null && !voiceoverBusy;

  async function onConfirmVoiceover(voiceover: ClipVoiceover | null) {
    if (!voiceover) {
      setVoiceoverOpen(false);
      return;
    }
    try {
      await applyVoiceover(voiceover);
      setVoiceoverOpen(false);
    } catch {
      // Error surfaced via applyError / status poll.
    }
  }

  const exportAriaLabel = isExporting
    ? 'Export in progress'
    : isFailed
      ? 'Export failed — try again'
      : `Export video ${title}`;

  const dialogError =
    exportError ??
    (isFailed ? 'Last export failed. Adjust options and try again.' : undefined);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 px-4 border border-b-[var(--glass-border-subtle)]">
      <Link
        to="/"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <span className="text-muted-foreground/60" aria-hidden>
        |
      </span>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h1>
      {recordingId != null ? (
        <>
          <div className="flex shrink-0 items-center gap-1.5">
            {voiceoverBusy ? (
              <span className="hidden text-[10px] text-muted-foreground sm:inline">
                {voiceoverStatus === 'running' || isApplying
                  ? 'Applying voiceover…'
                  : 'Voiceover queued…'}
              </span>
            ) : null}
            {voiceoverStatus === 'failed' && (voiceoverError || applyError) ? (
              <span className="hidden max-w-[10rem] truncate text-[10px] text-[var(--mr-bad)] sm:inline">
                {applyError ?? voiceoverError}
              </span>
            ) : null}
            <button
              type="button"
              aria-label="Add AI voiceover"
              disabled={!canAddVoiceover}
              onClick={() => setVoiceoverOpen(true)}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'shrink-0 gap-1.5',
                canAddVoiceover ? '' : 'opacity-50',
              )}
            >
              <Mic2 className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">AI voiceover</span>
            </button>
          </div>
          <button
            type="button"
            aria-label={exportAriaLabel}
            disabled={isExporting}
            onClick={() => {
              setExportOpen(true);
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'shrink-0',
              isFailed
                ? 'text-[var(--mr-bad)] hover:text-[var(--mr-bad)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isExporting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <FileDown aria-hidden />
            )}
          </button>
          {canCancel ? (
            <button
              type="button"
              aria-label="Cancel export"
              disabled={isCancelling}
              onClick={() => {
                cancelExport({
                  onSuccess: () => {
                    setExportOpen(false);
                  },
                });
              }}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'shrink-0 text-muted-foreground hover:text-[var(--mr-bad)]',
              )}
            >
              {isCancelling ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <X aria-hidden />
              )}
            </button>
          ) : null}
          {canDownload ? (
            <button
              type="button"
              aria-label={`Download exported video ${title}`}
              disabled={isDownloading}
              onClick={() => {
                void downloadExport();
              }}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'shrink-0 text-muted-foreground hover:text-foreground',
              )}
            >
              {isDownloading ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Download aria-hidden />
              )}
            </button>
          ) : null}
          <CutClipConfirmDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            title="Export video"
            description="Export this video with aspect framing and optional burned-in captions."
            confirmLabel="Export"
            pending={isExporting}
            errorMessage={dialogError}
            initialAspect={playerAspect}
            initialBurnSubtitles={playerCaptionsOn}
            onAspectChange={setPlayerAspect}
            onBurnSubtitlesChange={setPlayerCaptionsOn}
            onConfirm={async ({ aspectRatio, burnSubtitles }) => {
              startExport(aspectRatio, burnSubtitles, {
                onSuccess: () => {
                  setExportOpen(false);
                },
              });
            }}
          />
        </>
      ) : null}
      <ThemeToggle />
      {projectId != null ? (
        <>
          <button
            type="button"
            aria-label={`Delete project ${title}`}
            onClick={() => {
              reset();
              setConfirmOpen(true);
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'shrink-0 text-muted-foreground hover:text-[var(--mr-bad)]',
            )}
          >
            <Trash2 />
          </button>
          <ConfirmDeleteDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Delete ${title}?`}
            description="This deletes all recordings and clips in this project. This cannot be undone."
            pending={isDeleting}
            errorMessage={errorMessage}
            onConfirm={async () => {
              await deleteProject(projectId);
            }}
          />
        </>
      ) : null}
    
      <ClipVoiceoverDialog
        open={voiceoverOpen}
        onOpenChange={setVoiceoverOpen}
        defaultTitle={voiceoverDefaultTitle?.trim() || title}
        pending={isApplying}
        variant="recording"
        onConfirm={(voiceover) => {
          void onConfirmVoiceover(voiceover);
        }}
      />
</header>
  );
}
