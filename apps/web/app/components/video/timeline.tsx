import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';
import { HooksStrip } from '@/components/video/hooks-strip';
import { DEMO_MEDIA } from '@/lib/demo-media';
import {
  buildSpeakerColorMap,
  formatSpeakerLabel,
  getSpeakerColor,
} from '@/lib/speaker-colors';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type TimelineProps = {
  /** Optional peaks source; video MediaElement drives playback. */
  audioUrl?: string;
};

/** Peak bins for the full-timeline overview (WaveSurfer further max-aggregates to bar columns). */
const TARGET_PEAKS = 900;
/** Aim for ~this many ms of audio per peak bin on long media (clamped by TARGET_PEAKS_*). */
const TARGET_MS_PER_BIN = 120;
const TARGET_PEAKS_MIN = 600;
const TARGET_PEAKS_MAX = 2400;

/** Accent fill matching MintReels Workspace.html hook markers. */
const HOOK_REGION_FILL = 'oklch(0.62 0.13 165 / 0.10)';
const HOOK_REGION_FILL_SELECTED = 'oklch(0.62 0.13 165 / 0.22)';
const HOOK_REGION_BORDER = 'oklch(0.62 0.13 165)';

/** Fixed wave host height — must stay shrink-0 so cards never crush the canvas. */
const WAVEFORM_HEIGHT = 72;

function waitForContainerWidth(el: HTMLElement, signal: AbortSignal): Promise<number> {
  if (el.clientWidth > 0) {
    return Promise.resolve(el.clientWidth);
  }

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    let settled = false;
    const finish = (width: number) => {
      if (settled) {
        return;
      }
      settled = true;
      observer.disconnect();
      signal.removeEventListener('abort', onAbort);
      window.clearTimeout(timeout);
      resolve(width);
    };

    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) {
        finish(el.clientWidth);
      }
    });
    observer.observe(el);
    signal.addEventListener('abort', onAbort, { once: true });

    // react-spaces can lay out a tick later; don't hang forever
    const timeout = window.setTimeout(() => {
      finish(Math.max(el.clientWidth, 1));
    }, 2000);

    requestAnimationFrame(() => {
      if (el.clientWidth > 0) {
        finish(el.clientWidth);
      }
    });
  });
}

function targetPeakCount(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return TARGET_PEAKS;
  }
  const fromDuration = Math.ceil((durationSeconds * 1000) / TARGET_MS_PER_BIN);
  return Math.min(TARGET_PEAKS_MAX, Math.max(TARGET_PEAKS_MIN, fromDuration));
}

/**
 * Mean-absolute envelope for zoomed-out timelines.
 *
 * Max-abs over multi-hundred-ms bins (and WaveSurfer's bar renderer, which maxes
 * peaks into columns) saturates compressed speech to a near-constant height.
 * Mean-abs tracks speech energy so amplitude variation stays readable.
 * Values are in 0..1 (WaveSurfer mirrors a single channel for the bar waveform).
 */
function downsampleChannel(channel: Float32Array, targetPeaks: number): Float32Array {
  if (channel.length <= targetPeaks) {
    const peaks = new Float32Array(channel.length);
    for (let i = 0; i < channel.length; i += 1) {
      peaks[i] = Math.abs(channel[i] ?? 0);
    }
    return peaks;
  }

  const blockSize = channel.length / targetPeaks;
  const peaks = new Float32Array(targetPeaks);

  for (let i = 0; i < targetPeaks; i += 1) {
    const start = Math.floor(i * blockSize);
    const end = Math.min(channel.length, Math.floor((i + 1) * blockSize));
    const count = end - start;
    if (count <= 0) {
      peaks[i] = 0;
      continue;
    }

    let sum = 0;
    for (let sample = start; sample < end; sample += 1) {
      sum += Math.abs(channel[sample] ?? 0);
    }
    peaks[i] = sum / count;
  }

  return peaks;
}

async function decodePeaks(
  url: string,
  signal?: AbortSignal,
): Promise<{ peaks: Float32Array[]; duration: number } | null> {
  try {
    const response = await fetch(url, signal ? { signal } : undefined);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (signal?.aborted) {
      return null;
    }

    const audioContext = new AudioContext();
    try {
      const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const peakCount = targetPeakCount(buffer.duration);
      const peaks = Array.from({ length: Math.min(buffer.numberOfChannels, 1) }, (_, channel) =>
        downsampleChannel(buffer.getChannelData(channel), peakCount),
      );
      return { peaks, duration: buffer.duration };
    } finally {
      await audioContext.close();
    }
  } catch {
    return null;
  }
}

function createHookLabel(label: string): HTMLElement {
  const el = document.createElement('span');
  el.textContent = label;
  // Keep labels inside the region box — WaveSurfer parents clip overflow, so
  // design-style top:-9px labels were invisible.
  el.style.cssText = [
    'position:absolute',
    'top:3px',
    'left:4px',
    'z-index:5',
    'font-size:9px',
    'font-weight:600',
    "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace",
    `color:${HOOK_REGION_BORDER}`,
    'background:var(--background, oklch(1 0 0))',
    'padding:1px 4px',
    'border-radius:3px',
    'line-height:1.2',
    'pointer-events:none',
    'white-space:nowrap',
    `box-shadow:0 0 0 1px ${HOOK_REGION_BORDER}`,
  ].join(';');
  return el;
}

function styleHookRegion(region: Region, selected: boolean) {
  const el = region.element;
  if (!el) {
    return;
  }

  el.style.border = `${selected ? '1.5px' : '1px'} solid ${HOOK_REGION_BORDER}`;
  el.style.borderRadius = '6px';
  el.style.zIndex = selected ? '4' : '2';
  el.style.overflow = 'visible';
}

function paintHookRegions(
  regions: RegionsPlugin,
  hooks: readonly EditorHook[],
  duration: number,
  selectedHookId: string | null,
) {
  if (duration <= 0) {
    return;
  }

  regions.clearRegions();

  for (const hook of hooks) {
    if (hook.end <= hook.start) {
      continue;
    }

    const selected = hook.id === selectedHookId;
    const region = regions.addRegion({
      id: hook.id,
      start: Math.max(0, hook.start),
      end: Math.min(duration, hook.end),
      color: selected ? HOOK_REGION_FILL_SELECTED : HOOK_REGION_FILL,
      drag: false,
      resize: false,
      content: createHookLabel(hook.label),
    });
    styleHookRegion(region, selected);
  }
}

export function Timeline({ audioUrl = DEMO_MEDIA.audioUrl }: Readonly<TimelineProps>) {
  const mediaElement = useEditorStore((state) => state.mediaElement);
  const duration = useEditorStore((state) => state.video.duration);
  const segments = useEditorStore((state) => state.project?.result?.segments ?? []);
  const hooks = useEditorStore((state) => state.hooks);
  const selectedHookId = useEditorStore((state) => state.selectedHookId);
  const selectHookAndSeek = useEditorStore((state) => state.selectHookAndSeek);
  const seek = useEditorStore((state) => state.seek);

  const speakers = useMemo(
    () => [...new Set(segments.map((segment) => segment.speaker).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
    [segments],
  );
  const speakerColors = useMemo(() => buildSpeakerColorMap(speakers), [speakers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mediaElement) {
      setWaveformReady(false);
      return;
    }

    const media = mediaElement;
    const abort = new AbortController();
    let disposed = false;
    let wavesurfer: WaveSurfer | null = null;

    setWaveformReady(false);
    setLoadError(false);

    async function setup() {
      try {
        const decoded = audioUrl ? await decodePeaks(audioUrl, abort.signal) : null;
        if (disposed || abort.signal.aborted || !containerRef.current) {
          return;
        }

        // Absolute/zero-size hosts under react-spaces produce a blank canvas.
        await waitForContainerWidth(containerRef.current, abort.signal);
        if (disposed || abort.signal.aborted || !containerRef.current) {
          return;
        }

        const host = containerRef.current;
        const mediaDuration =
          Number.isFinite(media.duration) && media.duration > 0
            ? media.duration
            : (decoded?.duration ?? 0);

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        wavesurfer = WaveSurfer.create({
          container: host,
          media,
          height: WAVEFORM_HEIGHT,
          waveColor: '#c4c4c4',
          progressColor: '#5db89a',
          // Mint accent playhead — glow/rounding via `.mint-waveform::part(cursor)` in index.css
          cursorColor: 'oklch(0.55 0.14 165)',
          cursorWidth: 3,
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          barMinHeight: 2,
          normalize: true,
          interact: true,
          dragToSeek: true,
          plugins: [regions],
          ...(decoded
            ? { peaks: decoded.peaks, duration: mediaDuration || decoded.duration }
            : {}),
        });

        // Async gap: effect may have cleaned up between width wait and create.
        if (disposed) {
          wavesurfer.destroy();
          wavesurfer = null;
          return;
        }

        wavesurferRef.current = wavesurfer;

        const markReady = () => {
          if (disposed) {
            return;
          }
          setWaveformReady(true);
        };

        wavesurfer.on('ready', markReady);
        wavesurfer.on('interaction', (time) => {
          seek(time);
        });
        wavesurfer.on('error', () => {
          if (!disposed) {
            setLoadError(true);
          }
        });

        regions.on('region-clicked', (region, event) => {
          event.stopPropagation();
          selectHookAndSeek(region.id);
        });

        if (wavesurfer.getDecodedData() || wavesurfer.getDuration() > 0) {
          markReady();
        }
      } catch (error) {
        if (disposed || abort.signal.aborted) {
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setLoadError(true);
      }
    }

    void setup();

    return () => {
      disposed = true;
      abort.abort();
      const instance = wavesurfer ?? wavesurferRef.current;
      wavesurferRef.current = null;
      regionsRef.current = null;
      setWaveformReady(false);
      instance?.destroy();
    };
  }, [audioUrl, mediaElement, seek, selectHookAndSeek]);

  useEffect(() => {
    const regions = regionsRef.current;
    const wavesurfer = wavesurferRef.current;
    if (!regions || !wavesurfer || !waveformReady) {
      return;
    }

    const waveDuration = wavesurfer.getDuration() || duration;
    paintHookRegions(regions, hooks, waveDuration, selectedHookId);
  }, [duration, hooks, selectedHookId, waveformReady]);

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden border-t border-border bg-background">
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
        {speakers.length > 0 ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {speakers.map((speaker) => {
              const color = getSpeakerColor(speaker, speakerColors);
              return (
                <span
                  key={speaker}
                  className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] text-foreground"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: color.solid }}
                    aria-hidden
                  />
                  {formatSpeakerLabel(speaker)}
                </span>
              );
            })}
          </div>
        ) : null}

        {/*
          Block-level host (not absolute). Absolute + react-spaces often measured
          0×0 at WaveSurfer.create → blank canvas with a reserved white gap.
        */}
        <div
          className="relative w-full shrink-0 overflow-hidden rounded-md bg-muted/40"
          style={{ height: WAVEFORM_HEIGHT, minHeight: WAVEFORM_HEIGHT }}
        >
          <div ref={containerRef} className="mint-waveform h-full w-full" />
          {!mediaElement ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Waiting for video…
            </p>
          ) : null}
          {mediaElement && !waveformReady && !loadError ? (
            <p
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center justify-center',
                'text-xs text-muted-foreground',
              )}
            >
              Loading waveform…
            </p>
          ) : null}
          {loadError ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Waveform unavailable
            </p>
          ) : null}
        </div>

        {speakers.length > 0 && duration > 0 ? (
          <div
            className="relative h-2.5 w-full shrink-0 overflow-hidden rounded-full bg-muted"
            aria-label="Speaker activity"
          >
            {segments.map((segment) => {
              if (segment.end <= segment.start) {
                return null;
              }

              const left = (segment.start / duration) * 100;
              const width = Math.max(0.35, ((segment.end - segment.start) / duration) * 100);
              const color = getSpeakerColor(segment.speaker, speakerColors);

              return (
                <div
                  key={segment.id}
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    left: `${String(left)}%`,
                    width: `${String(width)}%`,
                    backgroundColor: color.solid,
                    opacity: 0.85,
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {/* Cards may scroll; wave + strip stay shrink-0 and visible */}
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <HooksStrip videoUrl={DEMO_MEDIA.videoUrl} />
        </div>
      </div>
    </section>
  );
}
