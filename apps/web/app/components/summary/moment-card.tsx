import { Download, Loader2 } from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { CutClipConfirmDialog } from '@/components/summary/cut-clip-confirm-dialog';
import { HookThumb } from '@/components/summary/hook-thumb';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClipDownload } from '@/hooks/use-clip-download';
import { useClipReadyAttention } from '@/hooks/use-clip-ready-attention';
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

/** Pitch API similarity (0..1) as a readable match strength for new users. */
function formatMatchLabel(similarity: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, similarity)) * 100);
  return `${String(pct)}% match`;
}

function matchScoreTooltip(similarity: number): string {
  const clamped = Math.min(1, Math.max(0, similarity));
  const pct = Math.round(clamped * 100);
  return (
    `Mint looked at your ask and this bit of the video, then guessed how alike they feel. ` +
    `${String(pct)}% means “pretty close” — closer to 100% is a better fit.`
  );
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

function stopCardActivate(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function MomentCard({ moment, selected, recordingId, onPreview }: Readonly<MomentCardProps>) {
  const mediaSrc = useEditorStore((state) => state.mediaElement?.currentSrc);
  const storeSrc = useEditorStore((state) => state.video.src);
  const videoUrl = mediaSrc || storeSrc || DEMO_MEDIA.videoUrl;
  const setPlayerAspect = useEditorStore((state) => state.setPlayerAspect);
  const setPlayerCaptionsOn = useEditorStore((state) => state.setPlayerCaptionsOn);
  const {
    clip,
    exportClip,
    isExporting,
    canExport,
    playerAspect,
    playerCaptionsOn,
    errorMessage,
  } = useMomentClipExport(recordingId, moment);
  const { isDownloading, download } = useClipDownload();
  const [cutOpen, setCutOpen] = useState(false);
  const showDownload = clip?.status === 'ready' && Boolean(clip.videoUrl);
  const inFlight = clip?.status === 'queued' || clip?.status === 'rendering' || isExporting;
  const actionLabel = cutLabel(clip?.status, isExporting);
  const {
    pulse: readyPulse,
    highlight: readyHighlight,
    setCardRef: setReadyCardRef,
    dismissHighlight: dismissReadyHighlight,
  } = useClipReadyAttention(
    clip?.id ?? `moment-${String(moment.startMs)}-${String(moment.endMs)}`,
    clip?.status,
  );
  const startSec = moment.startMs / 1000;
  const endSec = moment.endMs / 1000;
  const matchLabel = formatMatchLabel(moment.similarity);
  const scoreTooltip = matchScoreTooltip(moment.similarity);
  const thumbRatio = clip?.aspectRatio ?? clip?.ratio ?? playerAspect;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dismissReadyHighlight();
      onPreview();
    }
  }

  function onCutClip(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!canExport) {
      return;
    }
    setCutOpen(true);
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
    <>
      <div
        ref={setReadyCardRef}
        role="button"
        tabIndex={0}
        aria-label={`Preview moment ${moment.title}, ${matchLabel}`}
        onClick={() => {
          dismissReadyHighlight();
          onPreview();
        }}
        onPointerEnter={dismissReadyHighlight}
        onKeyDown={onKeyDown}
        className={cn(
          'glass flex w-full cursor-pointer items-stretch overflow-hidden rounded-md text-left',
          'outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50',
          selected
            ? 'border-[var(--mr-acc)] shadow-[var(--glass-shadow-elevated)] ring-2 ring-[color-mix(in_oklch,var(--mr-acc)_35%,transparent)]'
            : 'hover:border-[var(--glass-border)]',
          readyPulse && 'clip-ready-attention',
          readyHighlight && 'clip-ready-highlight',
        )}
      >
        <HookThumb
          start={startSec}
          chip={thumbRatio}
          videoUrl={videoUrl}
          className="aspect-[4/3] w-[128px] self-stretch"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-pretty text-foreground">
              {moment.title}
            </p>
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`${matchLabel}. How this score is calculated`}
                      className="glass-chip shrink-0 cursor-help rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-mr-acc"
                      onClick={stopCardActivate}
                      onPointerDown={stopCardActivate}
                    />
                  }
                >
                  {matchLabel}
                </TooltipTrigger>
                <TooltipContent side="left" align="start" className="max-w-[240px] text-left text-pretty leading-relaxed">
                  {scoreTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                  'shrink-0 text-[var(--mr-acc)] hover:text-[var(--mr-acc)]',
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

      <CutClipConfirmDialog
        open={cutOpen}
        onOpenChange={setCutOpen}
        title={`Cut clip — ${moment.title}`}
        pending={isExporting}
        errorMessage={errorMessage}
        initialAspect={playerAspect}
        initialBurnSubtitles={playerCaptionsOn}
        confirmLabel={clip?.status === 'failed' ? 'Retry' : 'Cut clip'}
        onAspectChange={(aspect) => {
          setPlayerAspect(aspect);
        }}
        onBurnSubtitlesChange={(burn) => {
          setPlayerCaptionsOn(burn);
        }}
        onConfirm={({ aspectRatio, burnSubtitles }) => {
          exportClip(aspectRatio, burnSubtitles, { onSuccess: () => setCutOpen(false) });
        }}
      />
    </>
  );
}
