import { ArrowLeft, Download, FileDown, Loader2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CutClipConfirmDialog } from '@/components/summary/cut-clip-confirm-dialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useDeleteProject } from '@/hooks/use-delete-project';
import { useRecordingExport } from '@/hooks/use-recording-export';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

export function EditorHeader({
  title,
  projectId,
  recordingId,
}: Readonly<{
  title: string;
  projectId?: number | undefined;
  recordingId?: number | undefined;
}>) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
    </header>
  );
}
