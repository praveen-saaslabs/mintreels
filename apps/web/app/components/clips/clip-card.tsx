import { Download, Loader2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useClipDownload } from '@/hooks/use-clip-download';
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

  return (
    <article className="glass flex h-full min-w-0 flex-col overflow-hidden rounded-lg">
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
          <span className="glass-chip inline-flex h-[19px] shrink-0 items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
            {formatClipDuration(clip)}
          </span>
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
        <div className="mt-auto flex h-8 items-end pt-2.5">
          {canDownload ? (
            <button
              type="button"
              aria-label={
                isDownloading ? `Downloading ${clip.title}` : `Download clip ${clip.title}`
              }
              disabled={isDownloading}
              onClick={onDownload}
              className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'w-full')}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
              {isDownloading ? 'Downloading…' : 'Download'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
