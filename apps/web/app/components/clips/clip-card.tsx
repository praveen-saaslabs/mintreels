import { Download, Loader2, Share2, Trash2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { ShareClipModal } from '@/components/summary/share-clip-modal';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useClipDownload } from '@/hooks/use-clip-download';
import { useClipReadyAttention } from '@/hooks/use-clip-ready-attention';
import { useDeleteClip } from '@/hooks/use-delete-clip';
import {
  formatClipDuration,
  formatClipProjectLabel,
  formatClipRange,
} from '@/lib/data/format';
import type { ClipSummary } from '@/lib/data/types';
import { clipDownloadFilename, isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { cn } from '@/lib/utils';

function statusClasses(status: ClipSummary['status']) {
  switch (status) {
    case 'ready':
      return 'bg-[color-mix(in_oklch,var(--mr-acc)_14%,transparent)] text-[var(--mr-acc)]';
    case 'rendering':
    case 'queued':
      return 'bg-[color-mix(in_oklch,var(--mr-warn)_14%,transparent)] text-[var(--mr-warn)]';
    case 'failed':
      return 'bg-[color-mix(in_oklch,var(--mr-bad)_14%,transparent)] text-[var(--mr-bad)]';
    default:
      return 'bg-[var(--mr-muted)] text-[var(--mr-mfg)]';
  }
}

export function ClipCard({ clip }: { clip: ClipSummary }) {
  const canDownload = clip.status === 'ready' && Boolean(clip.videoUrl);
  const { isDownloading, download } = useClipDownload();
  const { deleteClip, isDeleting, errorMessage, reset } = useDeleteClip();
  const {
    pulse: readyPulse,
    highlight: readyHighlight,
    setCardRef: setReadyCardRef,
    dismissHighlight: dismissReadyHighlight,
  } = useClipReadyAttention(clip.id, clip.status);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const projectLabel = formatClipProjectLabel(clip);
  const thumbnailUrl =
    typeof clip.thumbnailUrl === 'string' && isHttpsFilestackPlaybackUrl(clip.thumbnailUrl)
      ? clip.thumbnailUrl
      : null;

  function onDownload(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!clip.videoUrl || isDownloading) {
      return;
    }
    void download(clip.videoUrl, clipDownloadFilename(clip.title, clip.id));
  }

  function onShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!clip.videoUrl) {
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
      <article
        ref={setReadyCardRef}
        onPointerEnter={dismissReadyHighlight}
        className={cn(
          'glass flex h-full min-w-0 flex-col overflow-hidden rounded-lg',
          readyPulse && 'clip-ready-attention',
          readyHighlight && 'clip-ready-highlight',
        )}
      >
        <div className="relative flex aspect-[4/3] w-full shrink-0 flex-col justify-between overflow-hidden bg-[repeating-linear-gradient(135deg,var(--mr-stripe3)_0_10px,var(--mr-stripe4)_10px_20px)] p-2.5">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="relative z-10 flex items-start justify-between gap-1.5">
            {clip.ratio ? (
              <span className="glass-chip inline-flex h-[19px] items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
                {clip.ratio}
              </span>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-1">
              <span className="glass-chip inline-flex h-[19px] shrink-0 items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
                {formatClipDuration(clip)}
              </span>
              <button
                type="button"
                aria-label={`Delete clip ${clip.title}`}
                onClick={onDeleteClick}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                  'text-[var(--mr-onstripe)] hover:text-[var(--mr-bad)]',
                )}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2.5">
          <h3 className="line-clamp-2 min-h-[2.4em] text-[12.5px] leading-snug font-medium text-pretty">
            {clip.title}
          </h3>
          <p
            className="mt-1.5 min-w-0 truncate text-[10.5px] text-[var(--mr-mfg)]"
            title={projectLabel}
          >
            {projectLabel}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-mono text-[10.5px] text-[var(--mr-mfg)]">
              {formatClipRange(clip)}
            </span>
            <span
              className={cn(
                'inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 text-[10px] font-medium capitalize',
                statusClasses(clip.status),
              )}
            >
              {clip.status}
            </span>
          </div>
          <div className="mt-auto flex h-8 items-end gap-1.5 pt-2.5">
            {canDownload ? (
              <>
                <button
                  type="button"
                  aria-label={`Share clip ${clip.title}`}
                  onClick={onShare}
                  className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'flex-1')}
                >
                  <Share2 />
                  Share
                </button>
                <button
                  type="button"
                  aria-label={
                    isDownloading ? `Downloading ${clip.title}` : `Download clip ${clip.title}`
                  }
                  disabled={isDownloading}
                  onClick={onDownload}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'xs' }),
                    'flex-1 text-[var(--mr-acc)] hover:text-[var(--mr-acc)]',
                  )}
                >
                  {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                  {isDownloading ? 'Downloading…' : 'Download'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </article>

      {clip.videoUrl ? (
        <ShareClipModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          url={clip.videoUrl}
          title={clip.title}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${clip.title}?`}
        description="This removes the clip. The source recording and hook are kept."
        pending={isDeleting}
        errorMessage={errorMessage}
        onConfirm={async () => {
          await deleteClip(clip.id);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
