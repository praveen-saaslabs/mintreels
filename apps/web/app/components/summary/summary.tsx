import { EditorPane } from '@/components/video/editor-layout';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { useEditorStore } from '@/stores/editor-store';

type SummaryProps = {
  text?: string;
};

export function Summary({ text }: SummaryProps) {
  const recordingId = useRecordingId();
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const summary = text?.trim() ?? '';

  return (
    <EditorPane title="Summary">
      <p className="mb-3 font-mono text-xs text-muted-foreground">{formatTimestamp(currentTime)}</p>
      {summary.length > 0 ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{summary}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No summary yet{recordingId ? ` for recording ${String(recordingId)}` : ''}.
        </p>
      )}
    </EditorPane>
  );
}
