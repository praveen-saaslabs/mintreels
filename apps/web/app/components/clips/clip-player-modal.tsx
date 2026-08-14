import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isHttpsFilestackPlaybackUrl } from '@/lib/filestack-playback';
import { cn } from '@/lib/utils';

export type ClipPlayerAspect = '9:16' | '1:1' | '16:9';

type ClipPlayerModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  title: string;
  aspectRatio: ClipPlayerAspect;
  poster?: string | null;
}>;

const ASPECT_PARTS: Record<ClipPlayerAspect, { w: number; h: number }> = {
  '9:16': { w: 9, h: 16 },
  '1:1': { w: 1, h: 1 },
  '16:9': { w: 16, h: 9 },
};

const DIALOG_WIDTH: Record<ClipPlayerAspect, string> = {
  '9:16': 'w-[min(100%-2rem,22rem)]',
  '1:1': 'w-[min(100%-2rem,28rem)]',
  '16:9': 'w-[min(100%-2rem,48rem)]',
};

export function resolveClipPlayerAspect(
  ratio?: string | null,
  aspectRatio?: string | null,
): ClipPlayerAspect {
  const value = ratio ?? aspectRatio;
  if (value === '9:16' || value === '1:1' || value === '16:9') {
    return value;
  }
  return '9:16';
}

export function ClipPlayerModal({
  open,
  onOpenChange,
  src,
  title,
  aspectRatio,
  poster,
}: ClipPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playable = isHttpsFilestackPlaybackUrl(src);
  const posterUrl =
    typeof poster === 'string' && isHttpsFilestackPlaybackUrl(poster) ? poster : undefined;
  const { w, h } = ASPECT_PARTS[aspectRatio];

  function handleOpenChange(next: boolean) {
    if (!next) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'max-h-[calc(100vh-2rem)] max-w-none gap-3 overflow-hidden sm:max-w-none',
          DIALOG_WIDTH[aspectRatio],
        )}
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="truncate tracking-[-0.01em]">{title}</DialogTitle>
          <DialogDescription className="sr-only">Playing the exported clip</DialogDescription>
        </DialogHeader>

        {open && playable ? (
          <div
            className="relative mx-auto overflow-hidden rounded-lg bg-background ring-1 ring-[var(--glass-border-subtle)]"
            style={{
              aspectRatio: `${String(w)} / ${String(h)}`,
              width: `min(100%, calc(min(72vh, 40rem) * ${String(w)} / ${String(h)}))`,
              maxHeight: 'min(72vh, 40rem)',
            }}
          >
            {posterUrl ? (
              <img
                src={posterUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-110 object-cover opacity-80 blur-2xl"
              />
            ) : null}
            <video
              ref={videoRef}
              key={src}
              src={src}
              poster={posterUrl}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="absolute inset-0 z-1 h-full w-full object-contain"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
