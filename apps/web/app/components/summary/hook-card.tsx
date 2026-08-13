import type { KeyboardEvent } from 'react';
import { HookThumb } from '@/components/summary/hook-thumb';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type HookCardProps = {
  hook: EditorHook;
  selected: boolean;
  onPreview: () => void;
};

function formatHookDuration(start: number, end: number): string {
  return `${Math.max(0, Math.round(end - start))}s`;
}

export function HookCard({ hook, selected, onPreview }: HookCardProps) {
  const score = hook.score;
  const mediaSrc = useEditorStore((state) => state.mediaElement?.currentSrc);
  const storeSrc = useEditorStore((state) => state.video.src);
  const videoUrl = mediaSrc || storeSrc || DEMO_MEDIA.videoUrl;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPreview();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Preview hook ${hook.title}`}
      onClick={onPreview}
      onKeyDown={onKeyDown}
      className={cn(
        'glass flex w-full cursor-pointer items-center overflow-hidden rounded-md text-left',
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
        className="aspect-[4/3] w-[128px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
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
        <p className="font-mono text-[11px] text-muted-foreground">
          {formatTimestamp(hook.start)} – {formatTimestamp(hook.end)} ·{' '}
          {formatHookDuration(hook.start, hook.end)}
        </p>
        <span
          aria-hidden
          className={cn(
            buttonVariants({ variant: 'outline', size: 'xs' }),
            'pointer-events-none mt-auto w-fit opacity-50',
          )}
        >
          Cut clip
        </span>
      </div>
    </div>
  );
}
