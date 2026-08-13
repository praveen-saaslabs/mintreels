import { useEffect, useRef } from 'react';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

function formatHookRange(hook: EditorHook): string {
  return `${formatTimestamp(hook.start)} – ${formatTimestamp(hook.end)}`;
}

function HookThumb({
  start,
  ratio,
  videoUrl,
}: Readonly<{ start: number; ratio: string; videoUrl: string }>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const seekFrame = () => {
      if (Number.isFinite(start) && start >= 0) {
        video.currentTime = start;
      }
    };

    if (video.readyState >= 1) {
      seekFrame();
    } else {
      video.addEventListener('loadedmetadata', seekFrame, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', seekFrame);
    };
  }, [start, videoUrl]);

  return (
    <div className="relative h-[72px] min-h-[72px] w-full shrink-0 overflow-hidden bg-muted">
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        className="pointer-events-none h-full w-full object-cover"
      />
      <span
        className={cn(
          'pointer-events-none absolute left-1.5 top-1.5 z-10',
          'inline-flex h-[18px] items-center rounded-full',
          'bg-background/90 px-1.5 font-mono text-[10px] font-medium text-foreground',
          'ring-1 ring-border/80',
        )}
      >
        {ratio}
      </span>
    </div>
  );
}

export function HooksStrip({ videoUrl = DEMO_MEDIA.videoUrl }: Readonly<{ videoUrl?: string }>) {
  const hooks = useEditorStore((state) => state.hooks);
  const selectedHookId = useEditorStore((state) => state.selectedHookId);
  const selectHookAndSeek = useEditorStore((state) => state.selectHookAndSeek);

  if (hooks.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 gap-2.5 overflow-x-auto pb-0.5">
      {hooks.map((hook) => {
        const selected = hook.id === selectedHookId;

        return (
          <button
            key={hook.id}
            type="button"
            onClick={() => {
              selectHookAndSeek(hook.id);
            }}
            className={cn(
              'flex w-[172px] shrink-0 flex-col overflow-hidden rounded-[11px] border bg-card text-left transition-shadow',
              'min-h-[132px]',
              selected
                ? 'border-[oklch(0.62_0.13_165)] ring-2 ring-[oklch(0.62_0.13_165/0.35)]'
                : 'border-border hover:border-foreground/20',
            )}
          >
            <HookThumb start={hook.start} ratio={hook.ratio} videoUrl={videoUrl} />
            <div className="flex min-h-0 flex-col gap-1 px-2.5 py-2">
              <div className="truncate text-xs font-medium leading-snug text-foreground">
                {hook.title}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatHookRange(hook)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
