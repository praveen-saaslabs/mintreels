import { Download, Loader2 } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { HookThumb } from '@/components/summary/hook-thumb';
import { buttonVariants } from '@/components/ui/button';
import { useClipDownload } from '@/hooks/use-clip-download';
import { useMomentClipExport } from '@/hooks/use-moment-clip-export';
import type { MomentCandidate } from '@/lib/api';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { clipDownloadFilename } from '@/lib/filestack-playback';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

type MomentCardProps = {
  moment: MomentCandidate;
  selected: boolean;
  recordingId?: number | undefined;
  onPreview: () => void;
};

function formatDuration(startMs: number, endMs: number): string {
  return `${Math.max(0, Math.round((endMs - startMs) / 1000))}s`;
}

function cutLabel(status: string | undefined, isExporting: boolean): string {
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

export function MomentCard({ moment, selected, recordingId, onPreview }: MomentCardProps) {
  const mediaSrc = useEditorStore((state) => state.mediaElement?.currentSrc);
  const storeSrc = useEditorStore((state) => state.video.src);
  const videoUrl = mediaSrc || storeSrc || DEMO_MEDIA.videoUrl;
  const { clip, exportClip, isExporting, canExport } = useMomentClipExport(recordingId, moment);
  const { isDownloading, download } = useClipDownload();
  const showDownload = clip?.status === 'ready' && Boolean(clip.videoUrl);
  const inFlight = clip?.status === 'queued' || clip?.status === 'rendering' || isExporting;
  const actionLabel = cutLabel(clip?.status, isExporting);
  const startSec = moment.startMs / 1000;
  const endSec = moment.endMs / 1000;

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
    if (!clip?.videoUrl || isDownloading) {
      return;
    }
    void download(clip.videoUrl, clipDownloadFilename(moment.title, clip.id));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Preview moment ${moment.title}`}
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
        start={startSec}
        ratio="16:9"
        videoUrl={videoUrl}
        className="aspect-[4/3] w-[128px] self-stretch"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-pretty text-foreground">
            {moment.title}
          </p>
          <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-[var(--mr-acc)]">
            {moment.similarity.toFixed(2)}
          </span>
        </div>
        {moment.excerpt ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{moment.excerpt}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {formatTimestamp(startSec)} – {formatTimestamp(endSec)} · {formatDuration(moment.startMs, moment.endMs)}
          </p>
          {showDownload ? (
            <button
              type="button"
              aria-label={isDownloading ? `Downloading ${moment.title}` : `Download clip ${moment.title}`}
              disabled={isDownloading}
              onClick={onDownload}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                'shrink-0 text-foreground',
              )}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
