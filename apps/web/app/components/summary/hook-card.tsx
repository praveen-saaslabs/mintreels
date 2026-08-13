import { Download, Loader2, Share2, Trash2 } from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { HookThumb } from '@/components/summary/hook-thumb';
import { ShareClipModal } from '@/components/summary/share-clip-modal';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useClipDownload } from '@/hooks/use-clip-download';
import { useDeleteClip } from '@/hooks/use-delete-clip';
import { useHookClipExport } from '@/hooks/use-hook-clip-export';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { clipDownloadFilename } from '@/lib/filestack-playback';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorHook, type EditorHookStatus } from '@/stores/editor-store';

type HookCardProps = {
  hook: EditorHook;
  selected: boolean;
  recordingId?: number | undefined;
  onPreview: () => void;
};

function formatHookDuration(start: number, end: number): string {
  return `${Math.max(0, Math.round(end - start))}s`;
}

function cutClipLabel(status: EditorHookStatus, isExporting: boolean): string {
  if (isExporting) {
    return 'Starting…';
  }
  if (status === 'queued') {
    return 'Queued';
  }
  if (status === 'rendering') {
    return 'Rendering…';
  }
  if (status === 'failed') {
    return 'Retry';
  }
  return 'Cut clip';
}

function DeleteClipButton({
  title,
  onClick,
}: Readonly<{ title: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void }>) {
  return (
    <button
      type="button"
      aria-label={`Delete clip ${title}`}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
        'text-foreground hover:text-[var(--mr-bad)]',
      )}
    >
      <Trash2 />
    </button>
  );
}

export function HookCard({ hook, selected, recordingId, onPreview }: HookCardProps) {
  const score = hook.score;
  const mediaSrc = useEditorStore((state) => state.mediaElement?.currentSrc);
  const storeSrc = useEditorStore((state) => state.video.src);
  const clearHookClip = useEditorStore((state) => state.clearHookClip);
  const videoUrl = mediaSrc || storeSrc || DEMO_MEDIA.videoUrl;
  const { exportClip, isExporting, canExport } = useHookClipExport(recordingId, hook);
  const { isDownloading, download } = useClipDownload();
  const { deleteClip, isDeleting, errorMessage, reset } = useDeleteClip();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const showDownload = hook.status === 'ready' && Boolean(hook.clipVideoUrl);
  const canDeleteClip = hook.clipId != null;
  const inFlight = hook.status === 'queued' || hook.status === 'rendering' || isExporting;
  const actionLabel = cutClipLabel(hook.status, isExporting);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPreview();
    }
  }

  function onCutClip(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!canExport) {
      return;
    }
    exportClip();
  }

  function onDownload(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!hook.clipVideoUrl || isDownloading) {
      return;
    }
    void download(hook.clipVideoUrl, clipDownloadFilename(hook.title, hook.clipId));
  }

  function onShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!hook.clipVideoUrl) {
      return;
    }
    setShareOpen(true);
  }

  function onDeleteClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    reset();
    setConfirmOpen(true);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Preview hook ${hook.title}`}
        onClick={onPreview}
        onKeyDown={onKeyDown}
        className={cn(
          'glass flex w-full cursor-pointer items-stretch overflow-hidden rounded-md text-left',
          'outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50',
          selected
            ? 'border-[var(--mr-acc)] shadow-[var(--glass-shadow-elevated)] ring-2 ring-[color-mix(in_oklch,var(--mr-acc)_35%,transparent)]'
            : 'hover:border-[var(--glass-border)]',
        )}
      >
        <HookThumb
          start={hook.start}
          ratio={hook.ratio}
          videoUrl={videoUrl}
          className="aspect-[4/3] w-[128px] self-stretch"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-pretty text-foreground">
              {hook.title}
            </p>
            {score != null ? (
              <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-[var(--mr-acc)]">
                {score.toFixed(2)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
              {formatTimestamp(hook.start)} – {formatTimestamp(hook.end)} ·{' '}
              {formatHookDuration(hook.start, hook.end)}
            </p>
            {showDownload ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`Share clip ${hook.title}`}
                  onClick={onShare}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                    'text-foreground',
                  )}
                >
                  <Share2 />
                </button>
                <button
                  type="button"
                  aria-label={
                    isDownloading ? `Downloading ${hook.title}` : `Download clip ${hook.title}`
                  }
                  disabled={isDownloading}
                  onClick={onDownload}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                    'text-foreground',
                  )}
                >
                  {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                </button>
                {canDeleteClip ? (
                  <DeleteClipButton title={hook.title} onClick={onDeleteClick} />
                ) : null}
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-0.5">
                {canDeleteClip ? (
                  <DeleteClipButton title={hook.title} onClick={onDeleteClick} />
                ) : null}
                <button
                  type="button"
                  aria-label={actionLabel}
                  disabled={!canExport || inFlight}
                  onClick={onCutClip}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'xs' }),
                    'shrink-0',
                    canExport && !inFlight ? '' : 'opacity-50',
                  )}
                >
                  {actionLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hook.clipVideoUrl ? (
        <ShareClipModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          url={hook.clipVideoUrl}
          title={hook.title}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete clip for ${hook.title}?`}
        description="This removes the exported clip. The hook stays so you can cut again."
        pending={isDeleting}
        errorMessage={errorMessage}
        onConfirm={async () => {
          if (hook.clipId == null) {
            return;
          }
          await deleteClip(hook.clipId);
          clearHookClip(hook.id);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
