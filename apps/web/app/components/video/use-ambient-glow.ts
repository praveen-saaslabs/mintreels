import { useEffect, useRef, type RefObject } from 'react';

/** Target sample width; height follows the video’s intrinsic aspect. */
const SAMPLE_WIDTH = 48;
/** ~8 fps while playing — light enough for WaveSurfer + UI. */
const SAMPLE_INTERVAL_MS = 125;
const MIN_READY_STATE = HTMLMediaElement.HAVE_CURRENT_DATA;

function sampleSize(video: HTMLVideoElement): { width: number; height: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw > 0 && vh > 0) {
    return {
      width: SAMPLE_WIDTH,
      height: Math.max(1, Math.round((SAMPLE_WIDTH * vh) / vw)),
    };
  }

  return { width: SAMPLE_WIDTH, height: Math.round((SAMPLE_WIDTH * 9) / 16) };
}

/**
 * Samples the current video frame onto a small canvas for Ambient Mode glow.
 * Loops only while playing and the document is visible; one-shot on seek/pause/load.
 */
export function useAmbientGlow(videoRef: RefObject<HTMLVideoElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let lastSampleAt = 0;
    let looping = false;

    const drawSample = () => {
      if (video.readyState < MIN_READY_STATE) {
        return;
      }

      const { width, height } = sampleSize(video);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      try {
        ctx.drawImage(video, 0, 0, width, height);
      } catch {
        // Same-origin demo media should never taint; ignore transient draw failures.
      }
    };

    const tick = (now: number) => {
      if (!looping) {
        return;
      }

      if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
        lastSampleAt = now;
        drawSample();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (looping || document.hidden || video.paused) {
        return;
      }

      looping = true;
      lastSampleAt = 0;
      rafId = window.requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      looping = false;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onPlay = () => {
      startLoop();
    };

    const onPause = () => {
      stopLoop();
      drawSample();
    };

    const onSeeked = () => {
      drawSample();
    };

    const onLoadedData = () => {
      drawSample();
      if (!video.paused) {
        startLoop();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      drawSample();
      if (!video.paused) {
        startLoop();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoadedData);
    document.addEventListener('visibilitychange', onVisibilityChange);

    drawSample();
    if (!video.paused) {
      startLoop();
    }

    return () => {
      stopLoop();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoadedData);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [videoRef]);

  return canvasRef;
}
