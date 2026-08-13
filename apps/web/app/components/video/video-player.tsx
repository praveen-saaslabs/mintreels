import { Pause, Play } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { useAmbientGlow } from './use-ambient-glow';
import { useHotkey } from '@/hooks/use-hotkey';
import { beginDragSelectSuppression } from '@/lib/drag-select-guard';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

type VideoPlayerProps = {
  src?: string;
};

type AspectPreset = '9:16' | '1:1' | '16:9';

const ASPECT_PRESETS: AspectPreset[] = ['9:16', '1:1', '16:9'];

const ASPECT_RATIO: Record<AspectPreset, { w: number; h: number }> = {
  '9:16': { w: 9, h: 16 },
  '1:1': { w: 1, h: 1 },
  '16:9': { w: 16, h: 9 },
};

function finiteSeconds(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

export function VideoPlayer({ src = DEMO_MEDIA.videoUrl }: Readonly<VideoPlayerProps>) {
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const duration = useEditorStore((state) => state.video.duration);
  const playing = useEditorStore((state) => state.video.playing);
  const seekEpoch = useEditorStore((state) => state.video.seekEpoch);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setDuration = useEditorStore((state) => state.setDuration);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const setMediaElement = useEditorStore((state) => state.setMediaElement);
  const seek = useEditorStore((state) => state.seek);

  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientCanvasRef = useAmbientGlow(videoRef);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  /** Primary-button down position; used to ignore click after a drag on the surface. */
  const surfacePointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const [aspect, setAspect] = useState<AspectPreset>('16:9');
  const aspectParts = ASPECT_RATIO[aspect];
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  useEffect(() => {
    const video = videoRef.current;
    setMediaElement(video);
    return () => {
      setMediaElement(null);
    };
  }, [setMediaElement, src]);

  // Sole seek driver. WaveSurfer is peaks-only and follows via timeupdate/seeked.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekEpoch === 0) {
      return;
    }

    video.currentTime = currentTimeRef.current;
  }, [seekEpoch]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!video.paused) {
      video.pause();
      return;
    }

    if (!video.src && !video.currentSrc) {
      video.src = src;
    }

    try {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            cleanup();
            resolve();
          }, 8000);
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('Video failed to load'));
          };
          const cleanup = () => {
            window.clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
          };
          video.addEventListener('canplay', onCanPlay, { once: true });
          video.addEventListener('error', onError, { once: true });
        });
      }

      await video.play();
    } catch {
      setPlaying(false);
    }
  }

  // Editor-scoped: VideoPlayer only mounts on the editor route.
  // ignoreWhenEditable + preventDefault are useHotkey defaults for non-mod keys.
  useHotkey({
    key: ' ',
    onKeyDown: () => {
      void togglePlayback();
    },
  });
  useHotkey({
    key: 'k',
    onKeyDown: () => {
      void togglePlayback();
    },
  });

  function handleSurfacePointerDown(event: ReactPointerEvent<HTMLVideoElement>) {
    if (event.button !== 0) {
      surfacePointerDownRef.current = null;
      return;
    }
    surfacePointerDownRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleSurfaceClick(event: ReactMouseEvent<HTMLVideoElement>) {
    const down = surfacePointerDownRef.current;
    surfacePointerDownRef.current = null;
    if (!down) {
      return;
    }

    // Ignore clicks that were part of a drag (e.g. accidental scrub-like gesture).
    const dragThresholdPx = 6;
    if (
      Math.abs(event.clientX - down.x) > dragThresholdPx ||
      Math.abs(event.clientY - down.y) > dragThresholdPx
    ) {
      return;
    }

    void togglePlayback();
  }

  function seekFromClientX(clientX: number, target: HTMLElement) {
    if (duration <= 0) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }

  function handleProgressPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (duration <= 0 || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const endSuppress = beginDragSelectSuppression();
    const track = event.currentTarget;
    track.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX, track);

    const onMove = (moveEvent: PointerEvent) => {
      seekFromClientX(moveEvent.clientX, track);
    };
    const onUp = () => {
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onUp);
      endSuppress();
    };

    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
  }

  function handleProgressKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (duration <= 0) {
      return;
    }

    const step = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      seek(currentTime + step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      seek(currentTime - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      seek(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      seek(duration);
    }
  }

  return (
    <section className="flex h-full min-h-0 w-full select-none flex-col bg-transparent">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-[18px]">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-full flex-1 flex-col gap-3">
          <div
            className="relative min-h-0 w-full flex-1 grow overflow-visible"
            style={{ containerType: 'size' }}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                aspectRatio: `${String(aspectParts.w)} / ${String(aspectParts.h)}`,
                width: `min(100cqw, calc(100cqh * ${String(aspectParts.w)} / ${String(aspectParts.h)}))`,
                maxWidth: '100%',
                maxHeight: '100%',
                height: 'auto',
              }}
            >
              {/* Ambient glow — behind the video surface only (no charcoal bezel plate) */}
              <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
                <canvas
                  ref={ambientCanvasRef}
                  className="h-full w-full scale-[1.55] opacity-45 blur-3xl will-change-transform"
                />
              </div>

              {/* Opaque media surface so glass chrome never washes the picture */}
              <div
                className={cn(
                  'relative z-2 h-full w-full overflow-hidden rounded-2xl bg-background',
                  'ring-1 ring-[var(--glass-border-subtle)]',
                  'shadow-[var(--glass-shadow-elevated)]',
                )}
              >
                <video
                  ref={videoRef}
                  className="mr-no-drag absolute inset-0 h-full w-full cursor-pointer object-contain select-none"
                  style={{ background: 'transparent' }}
                  draggable={false}
                  preload="auto"
                  playsInline
                  src={src}
                  onPointerDown={handleSurfacePointerDown}
                  onClick={handleSurfaceClick}
                  onTimeUpdate={(event) => {
                    const time = finiteSeconds(event.currentTarget.currentTime);
                    if (time !== undefined) {
                      setCurrentTime(time);
                    }
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onLoadedMetadata={(event) => {
                    const nextDuration = finiteSeconds(event.currentTarget.duration);
                    if (nextDuration !== undefined) {
                      setDuration(nextDuration);
                    }
                  }}
                  onDurationChange={(event) => {
                    const nextDuration = finiteSeconds(event.currentTarget.duration);
                    if (nextDuration !== undefined) {
                      setDuration(nextDuration);
                    }
                  }}
                  onError={() => {
                    setPlaying(false);
                  }}
                >
                  <track kind="captions" srcLang="en" label="English" />
                </video>

                <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex gap-1.5">
                  <span className="glass-chip inline-flex h-[22px] items-center rounded-full px-2.5 font-mono text-[11px] text-foreground">
                    {formatTimestamp(currentTime)}
                    {duration > 0 ? ` / ${formatTimestamp(duration)}` : ''}
                  </span>
                </div>
                <div className="pointer-events-none absolute right-3.5 top-3.5 z-10 flex gap-1.5">
                  <span className="glass-chip inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] text-[var(--mr-acc)]">
                    auto-reframe on
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Frosted transport tray — glass chrome over ambient, not over media */}
          <div className="glass-tray flex flex-none flex-wrap items-center gap-2.5 px-3 py-2.5">
            <Button
              type="button"
              size="icon"
              variant="default"
              aria-label={playing ? 'Pause' : 'Play'}
              className="size-[34px] shrink-0 rounded-[10px]"
              onClick={() => {
                void togglePlayback();
              }}
            >
              {playing ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
            </Button>

            <span className="shrink-0 font-mono text-xs text-foreground/80">
              {formatTimestamp(currentTime)}
            </span>

            <div
              role={duration > 0 ? 'slider' : undefined}
              aria-label="Playback progress"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.min(currentTime, duration)}
              tabIndex={duration > 0 ? 0 : undefined}
              onPointerDown={handleProgressPointerDown}
              onKeyDown={handleProgressKeyDown}
              className={cn(
                'relative h-1.5 min-w-[80px] flex-1 touch-none rounded-full bg-foreground/10',
                duration > 0 && 'cursor-pointer',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--mr-acc)]"
                style={{ width: `${String(progressRatio * 100)}%` }}
              />
            </div>

            <span className="shrink-0 font-mono text-xs text-foreground/80">
              {duration > 0 ? formatTimestamp(duration) : '--:--'}
            </span>

            <div className="ml-0.5 flex shrink-0 gap-1">
              {ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAspect(preset)}
                  className={cn(
                    'inline-flex h-[26px] items-center rounded-lg px-2.5 text-[11px] font-medium transition-colors',
                    aspect === preset
                      ? 'bg-foreground text-background'
                      : 'glass-chip text-foreground/70 hover:bg-[var(--glass-bg-strong)]',
                  )}
                >
                  {preset}
                </button>
              ))}
              <span className="glass-chip inline-flex h-[26px] items-center rounded-lg px-2.5 text-[11px] text-foreground/70">
                Subtitles: Bold Mint
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
