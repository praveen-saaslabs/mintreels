import { useCallback, useEffect, useRef, useState } from 'react';

const PULSE_MS = 1400;
const HIGHLIGHT_MS = 5200;

/** Session-scoped: a clip id only gets ready attention (sound + visuals) once. */
const attendedClipIds = new Set<string>();

let audioContext: AudioContext | null = null;
let unlockListenersAttached = false;

function isInFlightStatus(status: string | undefined): boolean {
  return status === 'queued' || status === 'rendering';
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    return null;
  }
  if (!audioContext) {
    audioContext = new Ctx();
  }
  return audioContext;
}

/** Unlock AudioContext on first user gesture (cut clip / clicks count). */
function ensureAudioUnlockListeners(): void {
  if (typeof window === 'undefined' || unlockListenersAttached) {
    return;
  }
  unlockListenersAttached = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  peakGain: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

/** Soft two-note mint chime; fails silently (autoplay / suspended context). */
function playClipReadyChime(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const run = () => {
      const now = ctx.currentTime;
      // Soft G5 → C6 ding, low volume
      playTone(ctx, 784, now, 0.14, 0.055);
      playTone(ctx, 1046.5, now + 0.09, 0.22, 0.045);
    };

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(run)
        .catch(() => {});
      return;
    }
    run();
  } catch {
    // Autoplay / AudioContext failures — ignore
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMostlyOffScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
  if (visibleH <= 0 || visibleW <= 0) {
    return true;
  }
  const area = Math.max(1, rect.width * rect.height);
  const visibleArea = visibleH * visibleW;
  return visibleArea / area < 0.55;
}

function scrollCardIntoViewIfNeeded(el: HTMLElement): void {
  if (!isMostlyOffScreen(el)) {
    return;
  }
  try {
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  } catch {
    // ignore
  }
}

export type ClipReadyAttention = {
  /** Short shake + glare (~1.4s). */
  pulse: boolean;
  /** Persistent accent ring / soft glow until timeout or dismiss. */
  highlight: boolean;
  /** Attach to the card root for scroll-into-view. */
  setCardRef: (node: HTMLElement | null) => void;
  /** Clear the persistent highlight early (hover / click). */
  dismissHighlight: () => void;
};

/**
 * When status transitions queued/rendering → ready in this session:
 * short pulse, persistent highlight, soft chime, optional scroll-into-view.
 * Once per clip id (session Set). Skips already-ready mounts.
 */
export function useClipReadyAttention(
  attentionKey: string | number | null | undefined,
  status: string | undefined,
): ClipReadyAttention {
  const key = attentionKey == null || attentionKey === '' ? null : String(attentionKey);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const initializedRef = useRef(false);
  const [pulse, setPulse] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const cardElRef = useRef<HTMLElement | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    ensureAudioUnlockListeners();
  }, []);

  const setCardRef = useCallback((node: HTMLElement | null) => {
    cardElRef.current = node;
  }, []);

  const dismissHighlight = useCallback(() => {
    if (highlightTimerRef.current != null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlight(false);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevStatusRef.current = status;
      return;
    }

    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (!key || status !== 'ready' || !isInFlightStatus(prev)) {
      return;
    }
    if (attendedClipIds.has(key)) {
      return;
    }

    attendedClipIds.add(key);
    setPulse(true);
    setHighlight(true);
    playClipReadyChime();

    const el = cardElRef.current;
    if (el) {
      // After paint so layout includes ready UI (download icon).
      requestAnimationFrame(() => {
        scrollCardIntoViewIfNeeded(el);
      });
    }

    if (pulseTimerRef.current != null) {
      window.clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      pulseTimerRef.current = null;
      setPulse(false);
    }, PULSE_MS);

    if (highlightTimerRef.current != null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      highlightTimerRef.current = null;
      setHighlight(false);
    }, HIGHLIGHT_MS);
  }, [key, status]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current != null) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      if (highlightTimerRef.current != null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, []);

  return { pulse, highlight, setCardRef, dismissHighlight };
}
