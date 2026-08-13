import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';
import { SpeakerBadge } from '@/components/transcript/speaker-badge';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { suppressSelectionOnPointerDown } from '@/lib/drag-select-guard';
import { speakerCssColor, speakerSwatchClass } from '@/lib/speaker-style';
import { uniqueSpeakers } from '@/lib/transcript';
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

/**
 * WaveSurfer progress (played) bars — the dual-tone “2nd track” over the unplayed wave.
 * Not a speaker lane; mapped to speaker_2 (green slot) so it stays on the shared palette
 * instead of a one-off mint hex. Unplayed bars stay neutral gray.
 */
const WAVEFORM_PROGRESS_SPEAKER = 'speaker_2';

/** Accent fill matching MintReels Workspace.html hook markers. */
const HOOK_REGION_FILL = 'oklch(0.62 0.13 165 / 0.10)';
const HOOK_REGION_FILL_SELECTED = 'oklch(0.62 0.13 165 / 0.22)';
const HOOK_REGION_BORDER = 'oklch(0.62 0.13 165)';

/** Fixed wave host height — shrink-0 so layout never crushes the canvas. */
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
    'background:var(--glass-bg-strong, oklch(1 0 0 / 78%))',
    'padding:1px 4px',
    'border-radius:6px',
    'line-height:1.2',
    'pointer-events:none',
    'white-space:nowrap',
    'backdrop-filter:blur(8px)',
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

const REGION_LAYOUT_EPS = 0.02;

function paintHookRegions(
  plugin: RegionsPlugin,
  hooks: readonly EditorHook[],
  duration: number,
  selectedHookId: string | null,
) {
  if (duration <= 0) {
    return;
  }

  const validHooks = hooks.filter((hook) => hook.end > hook.start);
  const existing = plugin.getRegions();
  const byId = new Map(existing.map((region) => [region.id, region]));
  const sameLayout =
    existing.length === validHooks.length &&
    validHooks.every((hook) => {
      const region = byId.get(hook.id);
      if (!region) {
        return false;
      }
      return (
        Math.abs(region.start - Math.max(0, hook.start)) < REGION_LAYOUT_EPS &&
        Math.abs(region.end - Math.min(duration, hook.end)) < REGION_LAYOUT_EPS
      );
    });

  if (sameLayout) {
    for (const hook of validHooks) {
      const region = byId.get(hook.id);
      if (!region) {
        continue;
      }
      const selected = hook.id === selectedHookId;
      region.setOptions({
        color: selected ? HOOK_REGION_FILL_SELECTED : HOOK_REGION_FILL,
      });
      styleHookRegion(region, selected);
    }
    return;
  }

  plugin.clearRegions();

  for (const hook of validHooks) {
    const selected = hook.id === selectedHookId;
    const region = plugin.addRegion({
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

  const speakers = useMemo(() => uniqueSpeakers(segments), [segments]);

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
        if (!decoded) {
          setLoadError(true);
          return;
        }

        const mediaDuration =
          Number.isFinite(media.duration) && media.duration > 0
            ? media.duration
            : decoded.duration;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        // Peaks-only: VideoPlayer owns the <video>. Sharing `media` made WS write
        // currentTime and fight transcript/hook seeks (especially while paused).
        wavesurfer = WaveSurfer.create({
          container: host,
          height: WAVEFORM_HEIGHT,
          waveColor: '#c4c4c4',
          progressColor: speakerCssColor(WAVEFORM_PROGRESS_SPEAKER),
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
          peaks: decoded.peaks,
          duration: mediaDuration || decoded.duration,
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

  // Read-only playhead: video is the clock; WS cursor follows.
  useEffect(() => {
    const media = mediaElement;
    if (!media || !waveformReady) {
      return;
    }

    const syncCursor = () => {
      const wavesurfer = wavesurferRef.current;
      if (!wavesurfer) {
        return;
      }
      const mediaTime = media.currentTime;
      if (Math.abs(wavesurfer.getCurrentTime() - mediaTime) < 0.05) {
        return;
      }
      wavesurfer.setTime(mediaTime);
    };

    media.addEventListener('timeupdate', syncCursor);
    media.addEventListener('seeked', syncCursor);
    syncCursor();

    return () => {
      media.removeEventListener('timeupdate', syncCursor);
      media.removeEventListener('seeked', syncCursor);
    };
  }, [mediaElement, waveformReady]);

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
    <section className="glass-panel m-1.5 flex h-[calc(100%-0.75rem)] min-h-0 w-[calc(100%-0.75rem)] select-none flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
        {speakers.length > 0 ? (
          <div
            className="flex shrink-0 flex-wrap items-center gap-1.5"
            aria-label="Speakers"
          >
            {speakers.map((speaker) => (
              <SpeakerBadge key={speaker} speaker={speaker} />
            ))}
          </div>
        ) : null}

        {/*
          Block-level host (not absolute). Absolute + react-spaces often measured
          0×0 at WaveSurfer.create → blank canvas with a reserved white gap.
          Opaque enough for waveform bars; glass sits on the pane chrome only.
        */}
        <div
          className="relative w-full shrink-0 touch-none overflow-hidden rounded-xl bg-muted/55 ring-1 ring-[var(--glass-border-subtle)]"
          style={{ height: WAVEFORM_HEIGHT, minHeight: WAVEFORM_HEIGHT }}
          onPointerDown={suppressSelectionOnPointerDown}
        >
          <div ref={containerRef} className="mint-waveform h-full w-full select-none" />
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
              if (!segment.speaker.trim() || segment.end <= segment.start) {
                return null;
              }

              const left = (segment.start / duration) * 100;
              const width = Math.max(0.35, ((segment.end - segment.start) / duration) * 100);

              return (
                <div
                  key={segment.id}
                  className={cn(
                    'absolute inset-y-0 rounded-sm opacity-85',
                    speakerSwatchClass(segment.speaker),
                  )}
                  style={{
                    left: `${String(left)}%`,
                    width: `${String(width)}%`,
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
