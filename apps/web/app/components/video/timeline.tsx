import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';
import { WaveformEmptyState } from '@/components/editor/editor-empty-states';
import { SpeakerBadge } from '@/components/transcript/speaker-badge';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { suppressSelectionOnPointerDown } from '@/lib/drag-select-guard';
import { speakerCssColor, speakerSwatchClass } from '@/lib/speaker-style';
import { finiteDuration, maxClockDuration } from '@/lib/time';
import { EMPTY_SEGMENTS, uniqueSpeakers } from '@/lib/transcript';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type TimelineProps = {
  /** Extracted audio only. Never pass the original video — decodePeaks() downloads the whole file. */
  audioUrl?: string;
  pending?: boolean;
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
/** Overlay playhead width — matches former WaveSurfer cursorWidth. */
const PLAYHEAD_WIDTH_PX = 3;

function videoClockDuration(
  media: HTMLMediaElement,
  storeDuration: number,
  waveDuration = 0,
): number {
  return maxClockDuration(media.duration, storeDuration, waveDuration);
}

function playheadRatio(time: number, duration: number): number {
  if (duration <= 0 || !Number.isFinite(time)) {
    return 0;
  }
  return Math.min(1, Math.max(0, time / duration));
}

function paintPlayhead(playhead: HTMLDivElement, host: HTMLElement, ratio: number): void {
  const x = ratio * host.clientWidth - PLAYHEAD_WIDTH_PX / 2;
  playhead.style.transform = `translate3d(${String(x)}px,0,0)`;
  host.style.setProperty('--mr-playhead', String(ratio));
}

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

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.startsWith('video/')) {
      await response.body?.cancel();
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

export function Timeline({
  audioUrl = DEMO_MEDIA.audioUrl,
  pending = false,
}: Readonly<TimelineProps>) {
  const mediaElement = useEditorStore((state) => state.mediaElement);
  const duration = useEditorStore((state) => state.video.duration);
  const setDuration = useEditorStore((state) => state.setDuration);
  const segments = useEditorStore((state) => state.project?.result?.segments ?? EMPTY_SEGMENTS);
  const hooks = useEditorStore((state) => state.hooks);
  const selectedHookId = useEditorStore((state) => state.selectedHookId);
  const selectHookAndSeek = useEditorStore((state) => state.selectHookAndSeek);
  const seek = useEditorStore((state) => state.seek);

  const speakers = useMemo(() => uniqueSpeakers(segments), [segments]);

  const containerRef = useRef<HTMLDivElement>(null);
  const waveformShellRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const draggingRef = useRef(false);
  const [waveformReady, setWaveformReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setWaveformReady(false);
      return;
    }

    if (!audioUrl) {
      setWaveformReady(false);
      setLoadError(false);
      return;
    }

    const abort = new AbortController();
    let disposed = false;
    let wavesurfer: WaveSurfer | null = null;

    setWaveformReady(false);
    setLoadError(false);

    async function setup() {
      try {
        const decoded = await decodePeaks(audioUrl, abort.signal);
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

        const decodedDuration = finiteDuration(decoded.duration);
        if (decodedDuration !== undefined) {
          setDuration(decodedDuration);
        }
        const mediaDuration = decodedDuration ?? decoded.duration;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        // Peaks-only: VideoPlayer owns the <video>. Sharing `media` made WS write
        // currentTime and fight transcript/hook seeks (especially while paused).
        wavesurfer = WaveSurfer.create({
          container: host,
          height: WAVEFORM_HEIGHT,
          waveColor: '#c4c4c4',
          progressColor: speakerCssColor(WAVEFORM_PROGRESS_SPEAKER),
          // Overlay playhead is rAF-driven; WS cursor/timeupdate would jump ~1s.
          cursorWidth: 0,
          hideScrollbar: true,
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

        const instance = wavesurfer;
        wavesurferRef.current = instance;

        const markReady = () => {
          if (disposed) {
            return;
          }
          const wsDuration = finiteDuration(instance.getDuration());
          if (wsDuration !== undefined) {
            setDuration(wsDuration);
          }
          setWaveformReady(true);
        };

        instance.on('ready', markReady);
        instance.on('interaction', (time) => {
          const waveDuration = instance.getDuration();
          const { mediaElement: media, video } = useEditorStore.getState();
          const clock = media
            ? videoClockDuration(media, video.duration, waveDuration)
            : maxClockDuration(video.duration, waveDuration);
          if (waveDuration > 0 && clock > 0) {
            seek((time / waveDuration) * clock);
          } else {
            seek(time);
          }
        });
        instance.on('error', () => {
          if (!disposed) {
            setLoadError(true);
          }
        });

        regions.on('region-clicked', (region, event) => {
          event.stopPropagation();
          selectHookAndSeek(region.id);
        });

        if (instance.getDecodedData() || instance.getDuration() > 0) {
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
  }, [audioUrl, seek, selectHookAndSeek, setDuration]);

  // Overlay playhead: video is the clock. rAF from HTMLVideoElement.currentTime
  // — never Zustand currentTime or wavesurfer.setTime (timeupdate is ~1–4Hz).
  useEffect(() => {
    const media = mediaElement;
    const playhead = playheadRef.current;
    const host = waveformShellRef.current;
    const wavesurfer = wavesurferRef.current;
    if (!media || !playhead || !host || !waveformReady) {
      return;
    }

    let raf = 0;
    let running = false;

    const paintFromMedia = () => {
      const waveDuration = wavesurferRef.current?.getDuration() ?? 0;
      const duration = videoClockDuration(media, durationRef.current, waveDuration);
      paintPlayhead(playhead, host, playheadRatio(media.currentTime, duration));
    };

    const tick = () => {
      if (!draggingRef.current) {
        paintFromMedia();
      }
      if (!media.paused && !media.ended) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        raf = 0;
      }
    };

    const start = () => {
      if (running) {
        return;
      }
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const snap = () => {
      if (!draggingRef.current) {
        paintFromMedia();
      }
    };

    const onDrag = (relativeX: number) => {
      draggingRef.current = true;
      paintPlayhead(playhead, host, Math.min(1, Math.max(0, relativeX)));
    };

    const onDragEnd = () => {
      draggingRef.current = false;
      paintFromMedia();
    };

    media.addEventListener('play', start);
    media.addEventListener('pause', snap);
    media.addEventListener('ended', snap);
    media.addEventListener('seeking', snap);
    media.addEventListener('seeked', snap);
    media.addEventListener('loadedmetadata', snap);
    media.addEventListener('durationchange', snap);

    const unDrag = wavesurfer?.on('drag', onDrag);
    const unDragStart = wavesurfer?.on('dragstart', onDrag);
    const unDragEnd = wavesurfer?.on('dragend', onDragEnd);

    const resizeObserver = new ResizeObserver(() => {
      paintFromMedia();
    });
    resizeObserver.observe(host);

    if (!media.paused && !media.ended) {
      start();
    } else {
      paintFromMedia();
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      media.removeEventListener('play', start);
      media.removeEventListener('pause', snap);
      media.removeEventListener('ended', snap);
      media.removeEventListener('seeking', snap);
      media.removeEventListener('seeked', snap);
      media.removeEventListener('loadedmetadata', snap);
      media.removeEventListener('durationchange', snap);
      unDrag?.();
      unDragStart?.();
      unDragEnd?.();
      resizeObserver.disconnect();
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

  const showWaveformEmpty = !waveformReady && !loadError && (pending || Boolean(audioUrl));
  const showWaveformUnavailable = !waveformReady && !showWaveformEmpty && (loadError || !pending);

  let speakerRow: ReactNode = null;
  if (speakers.length > 0) {
    speakerRow = (
      <div className="flex shrink-0 flex-wrap items-center gap-1.5" aria-label="Speakers">
        {speakers.map((speaker) => (
          <SpeakerBadge key={speaker} speaker={speaker} />
        ))}
      </div>
    );
  }

  let speakerActivity: ReactNode = null;
  if (speakers.length > 0 && duration > 0) {
    speakerActivity = (
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
                'absolute inset-y-0 rounded opacity-85',
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
    );
  }

  return (
    <section className="border-t border-[var(--glass-border-subtle)] flex h-full min-h-0 w-full select-none flex-col overflow-hidden border-x-0!">
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
        {speakerRow}

        {/*
          Block-level host (not absolute). Absolute + react-spaces often measured
          0×0 at WaveSurfer.create → blank canvas with a reserved white gap.
          Opaque enough for waveform bars; glass sits on the pane chrome only.
        */}
        <div
          ref={waveformShellRef}
          className="mint-waveform-shell relative w-full shrink-0 touch-none overflow-hidden rounded bg-muted/55 ring-1 ring-[var(--glass-border-subtle)]"
          style={{ height: WAVEFORM_HEIGHT, minHeight: WAVEFORM_HEIGHT }}
          onPointerDown={suppressSelectionOnPointerDown}
        >
          <div ref={containerRef} className="mint-waveform h-full w-full select-none" />
          <div
            ref={playheadRef}
            className="mint-waveform-playhead"
            hidden={!waveformReady}
            aria-hidden
          />
          {showWaveformEmpty ? <WaveformEmptyState /> : null}
          {showWaveformUnavailable ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Waveform unavailable
            </p>
          ) : null}
        </div>

        {speakerActivity}
      </div>
    </section>
  );
}
