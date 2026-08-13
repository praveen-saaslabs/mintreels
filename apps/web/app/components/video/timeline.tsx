import type { MouseEvent } from 'react';
import { EditorPane } from '@/components/video/editor-layout';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { useEditorStore } from '@/stores/editor-store';

export function Timeline() {
  const recordingId = useRecordingId();
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const duration = useEditorStore((state) => state.video.duration);
  const segments = useEditorStore((state) => state.project?.result?.segments ?? []);
  const seek = useEditorStore((state) => state.seek);

  const playheadRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const canSeek = duration > 0;

  function handleTrackClick(event: MouseEvent<HTMLDivElement>) {
    if (!canSeek) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }

  return (
    <EditorPane title="Timeline">
      <div className="flex h-full min-h-24 flex-col justify-center gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTimestamp(currentTime)}</span>
          <span>
            {duration > 0
              ? formatTimestamp(duration)
              : recordingId
                ? `Recording ${String(recordingId)}`
                : 'Recording'}
          </span>
        </div>

        <div
          role={canSeek ? 'slider' : undefined}
          aria-label="Playback timeline"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.min(currentTime, duration)}
          tabIndex={canSeek ? 0 : undefined}
          onClick={handleTrackClick}
          className={
            canSeek
              ? 'relative h-10 cursor-pointer rounded-md bg-muted ring-1 ring-foreground/10'
              : 'relative h-10 rounded-md bg-muted ring-1 ring-foreground/10'
          }
        >
          {duration > 0
            ? segments.map((segment) => {
                const left = (segment.start / duration) * 100;
                const width = Math.max(0.5, ((segment.end - segment.start) / duration) * 100);

                return (
                  <div
                    key={segment.id}
                    className="absolute top-2 bottom-2 rounded-sm bg-primary/25"
                    style={{ left: `${String(left)}%`, width: `${String(width)}%` }}
                  />
                );
              })
            : null}

          {duration > 0 ? (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary"
              style={{ left: `${String(playheadRatio * 100)}%` }}
            />
          ) : (
            <p className="flex h-full items-center justify-center px-3 text-xs text-muted-foreground">
              Timeline is empty until duration or transcript segments are available.
            </p>
          )}
        </div>
      </div>
    </EditorPane>
  );
}
