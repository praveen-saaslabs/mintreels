import { useEffect, useRef } from 'react';
import { DEMO_MEDIA } from '@/lib/demo-media';
import { cn } from '@/lib/utils';

type HookThumbProps = {
  start: number;
  ratio: string;
  videoUrl?: string;
  className?: string;
};

export function HookThumb({
  start,
  ratio,
  videoUrl = DEMO_MEDIA.videoUrl,
  className,
}: HookThumbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const seekFrame = () => {
      if (!Number.isFinite(start) || start < 0) {
        return;
      }
      try {
        video.currentTime = start;
      } catch {
        // Not seekable yet (HAVE_NOTHING). loadedmetadata will retry.
      }
    };

    video.addEventListener('loadedmetadata', seekFrame);
    video.addEventListener('loadeddata', seekFrame);
    if (video.readyState >= 1) {
      seekFrame();
    }

    return () => {
      video.removeEventListener('loadedmetadata', seekFrame);
      video.removeEventListener('loadeddata', seekFrame);
    };
  }, [start, videoUrl]);

  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-muted', className)}>
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
        className="pointer-events-none h-full w-full object-cover"
      />
      <span className="glass-chip pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex h-[18px] items-center rounded-full px-1.5 font-mono text-[10px] font-medium text-foreground">
        {ratio}
      </span>
    </div>
  );
}
