import { ArrowUpRight, Download, Loader2, Play, Share2, Trash2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ClipPlayerModal, resolveClipPlayerAspect } from '@/components/clips/clip-player-modal';
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
import { editorDeepLinkSearch } from '@/lib/editor-deep-link';
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

function ClipCardThumbnail({
  title,
  ratio,
  thumbnailUrl,
  canPlay,
  onPlay,
}: Readonly<{
  title: string;
  ratio?: ClipSummary['ratio'];
  thumbnailUrl: string | null;
  canPlay: boolean;
  onPlay: () => void;
}>) {
  const className = cn(
    'relative flex aspect-[4/3] w-full shrink-0 flex-col justify-between overflow-hidden bg-[repeating-linear-gradient(135deg,var(--mr-stripe3)_0_10px,var(--mr-stripe4)_10px_20px)] p-3',
    canPlay && 'group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
  );

  const inner = (
    <>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {ratio ? (
        <div className="relative z-10 flex items-start">
          <span className="glass-chip inline-flex h-[19px] items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
            {ratio}
          </span>
        </div>
      ) : null}
      {canPlay ? (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          aria-hidden
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-black/45 text-white shadow-sm ring-1 ring-white/20 transition-[transform,background-color] duration-100 group-hover:scale-105 group-hover:bg-black/60">
            <Play className="size-3.5 fill-current" />
          </span>
        </span>
      ) : null}
    </>
  );

  if (canPlay) {
    return (
      <button type="button" aria-label={`Play ${title}`} className={className} onClick={onPlay}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function ClipCard({ clip }: Readonly<{ clip: ClipSummary }>) {
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
  const [playerOpen, setPlayerOpen] = useState(false);
  const projectLabel = formatClipProjectLabel(clip);
  const thumbnailUrl =
    typeof clip.thumbnailUrl === 'string' && isHttpsFilestackPlaybackUrl(clip.thumbnailUrl)
      ? clip.thumbnailUrl
      : null;
  const playbackUrl =
    clip.status === 'ready' &&
    typeof clip.videoUrl === 'string' &&
    isHttpsFilestackPlaybackUrl(clip.videoUrl)
      ? clip.videoUrl
      : null;
  const canPlay = Boolean(playbackUrl);
  const exportAspect = resolveClipPlayerAspect(clip.ratio, clip.aspectRatio);

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
          'glass flex h-full min-w-0 flex-col overflow-hidden rounded-md',
          readyPulse && 'clip-ready-attention',
          readyHighlight && 'clip-ready-highlight',
        )}
      >
        <ClipCardThumbnail
          title={clip.title}
          ratio={clip.ratio}
          thumbnailUrl={thumbnailUrl}
          canPlay={canPlay}
          onPlay={() => setPlayerOpen(true)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3.5">
          <h3 className="line-clamp-2 text-[12.5px] leading-snug font-medium text-pretty">
            {clip.title}
          </h3>
          {clip.projectId > 0 ? (
            <Link
              to={`/editor/${String(clip.projectId)}${editorDeepLinkSearch({
                tab: 'hooks',
                startMs: clip.startMs,
                hookId: clip.hookId,
                recordingId: clip.recordingId,
              })}`}
              title={`Open project ${projectLabel} at this clip`}
              className="mt-2 inline-flex min-w-0 cursor-pointer items-center gap-1 text-[10.5px] text-[var(--mr-mfg)] underline-offset-2 hover:text-foreground hover:underline"
            >
              <span className="truncate">{projectLabel}</span>
              <ArrowUpRight className="size-3 shrink-0" />
            </Link>
          ) : (
            <p
              className="mt-2 min-w-0 truncate text-[10.5px] text-[var(--mr-mfg)]"
              title={projectLabel}
            >
              {projectLabel}
            </p>
          )}
          <div className="mt-auto flex min-w-0 flex-col gap-1.5 pt-3.5">
            <div className="flex w-full min-w-0 items-baseline justify-between gap-3 font-mono text-[10.5px] text-[var(--mr-mfg)]">
              <span className="min-w-0">{formatClipRange(clip)}</span>
              <span className="shrink-0">{formatClipDuration(clip)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  'inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-medium capitalize',
                  statusClasses(clip.status),
                )}
              >
                {clip.status}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {canDownload ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Share clip ${clip.title}`}
                      onClick={onShare}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'icon-xs' }),
                        'rounded-full',
                      )}
                    >
                      <Share2 />
                    </button>
                    <button
                      type="button"
                      aria-label={
                        isDownloading ? `Downloading ${clip.title}` : `Download clip ${clip.title}`
                      }
                      disabled={isDownloading}
                      onClick={onDownload}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'icon-xs' }),
                        'rounded-full text-[var(--mr-acc)] hover:text-[var(--mr-acc)]',
                      )}
                    >
                      {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  aria-label={`Delete clip ${clip.title}`}
                  onClick={onDeleteClick}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'icon-xs' }),
                    'rounded-full hover:text-[var(--mr-bad)]',
                  )}
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {playbackUrl ? (
        <ClipPlayerModal
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          src={playbackUrl}
          title={clip.title}
          aspectRatio={exportAspect}
          poster={thumbnailUrl}
        />
      ) : null}

      {clip.videoUrl ? (
        <ShareClipModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          url={clip.videoUrl}
          title={clip.title}
          clipId={clip.id}
          socialTitle={clip.socialTitle ?? null}
          socialDescription={clip.socialDescription ?? null}
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
