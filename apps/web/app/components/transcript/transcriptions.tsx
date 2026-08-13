import { Badge } from '@/components/ui/badge';
import { EditorPane } from '@/components/video/editor-layout';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorSegment } from '@/stores/editor-store';

function findSegmentAtTime(
  segments: readonly EditorSegment[],
  time: number,
): EditorSegment | undefined {
  return (
    segments.find((segment) => time >= segment.start && time < segment.end) ??
    segments.find((segment) => time === segment.end)
  );
}

export function Transcriptions() {
  const recordingId = useRecordingId();
  const segments = useEditorStore((state) => state.project?.result?.segments ?? []);
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const seek = useEditorStore((state) => state.seek);
  const activeSegment = findSegmentAtTime(segments, currentTime);

  return (
    <EditorPane title="Transcriptions">
      {segments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transcript yet{recordingId ? ` for recording ${String(recordingId)}` : ''}.
        </p>
      ) : (
        <ol className="space-y-2">
          {segments.map((segment) => {
            const isActive = segment.id === activeSegment?.id;

            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => seek(segment.start)}
                  className={cn(
                    'w-full rounded-lg border border-transparent px-2 py-2 text-left hover:bg-muted/80',
                    isActive && 'border-border bg-muted',
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <time
                      className="font-mono text-xs text-muted-foreground"
                      dateTime={`${String(segment.start)}s`}
                    >
                      {formatTimestamp(segment.start)}
                    </time>
                    {segment.speaker ? <Badge variant="secondary">{segment.speaker}</Badge> : null}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{segment.text}</p>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </EditorPane>
  );
}
