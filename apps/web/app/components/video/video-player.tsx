import { useEffect, useRef } from 'react';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { useEditorStore } from '@/stores/editor-store';

function finiteSeconds(value: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

export function VideoPlayer() {
  const recordingId = useRecordingId();
  const src = useEditorStore((state) => state.video.src);
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const seekEpoch = useEditorStore((state) => state.video.seekEpoch);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setDuration = useEditorStore((state) => state.setDuration);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekEpoch === 0) {
      return;
    }

    video.currentTime = currentTimeRef.current;
  }, [seekEpoch]);

  return (
    <section className="flex h-full min-h-0 w-full flex-col border border-border bg-neutral-950">
      <header className="shrink-0 border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium text-neutral-100">Video</h2>
      </header>
      <div className="min-h-0 flex-1 bg-black">
        {src ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            controls
            preload="metadata"
            src={src}
            onTimeUpdate={(event) => {
              const time = finiteSeconds(event.currentTarget.currentTime);
              if (time !== undefined) {
                setCurrentTime(time);
              }
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(event) => {
              const duration = finiteSeconds(event.currentTarget.duration);
              if (duration !== undefined) {
                setDuration(duration);
              }
              event.currentTarget.currentTime = currentTimeRef.current;
            }}
            onDurationChange={(event) => {
              const duration = finiteSeconds(event.currentTarget.duration);
              if (duration !== undefined) {
                setDuration(duration);
              }
            }}
          />
        ) : (
          <div className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-1 text-sm text-neutral-400">
            <span>Video player{recordingId ? ` · recording ${String(recordingId)}` : ''}</span>
            <span className="font-mono text-xs">{formatTimestamp(currentTime)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
