import { useMemo } from 'react';
import {
  HooksListEmptyState,
  SummaryTextEmptyState,
} from '@/components/editor/editor-empty-states';
import { HookCard } from '@/components/summary/hook-card';
import { MomentSearch } from '@/components/summary/moment-search';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPane } from '@/components/video/editor-layout';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type SummaryProps = Readonly<{
  text?: string;
  pendingHooks?: boolean;
  pendingSummary?: boolean;
}>;

function rankHooksByScore(hooks: EditorHook[]): EditorHook[] {
  return [...hooks].sort(
    (a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY),
  );
}

function HooksPane({
  rankedHooks,
  selectedHookId,
  pending,
  recordingId,
  onPreview,
}: Readonly<{
  rankedHooks: EditorHook[];
  selectedHookId: string | null;
  pending: boolean;
  recordingId: number | undefined;
  onPreview: (id: string) => void;
}>) {
  if (rankedHooks.length > 0) {
    return (
      <ul className="flex flex-col gap-2.5">
        {rankedHooks.map((hook) => (
          <li key={hook.id}>
            <HookCard
              hook={hook}
              selected={hook.id === selectedHookId}
              recordingId={recordingId}
              onPreview={() => {
                onPreview(hook.id);
              }}
            />
          </li>
        ))}
      </ul>
    );
  }

  if (pending) {
    return <HooksListEmptyState />;
  }

  return <p className="text-sm text-muted-foreground">No hooks yet.</p>;
}

function SummaryPane({
  summary,
  pending,
  recordingId,
}: Readonly<{
  summary: string;
  pending: boolean;
  recordingId: number | undefined;
}>) {
  if (summary.length > 0) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{summary}</p>
    );
  }

  if (pending) {
    return <SummaryTextEmptyState />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      No summary yet{recordingId ? ` for recording ${String(recordingId)}` : ''}.
    </p>
  );
}

export function Summary({ text, pendingHooks = false, pendingSummary = false }: SummaryProps) {
  const recordingId = useRecordingId();
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const hooks = useEditorStore((state) => state.hooks);
  const selectedHookId = useEditorStore((state) => state.selectedHookId);
  const selectHookAndSeek = useEditorStore((state) => state.selectHookAndSeek);
  const storeSummary = useEditorStore((state) => state.project?.result?.text ?? '');
  const summary = (text?.trim() || storeSummary).trim();
  const rankedHooks = useMemo(() => rankHooksByScore(hooks), [hooks]);

  return (
    <Tabs defaultValue="hooks" className="flex h-full min-h-0 w-full flex-col gap-0">
      <EditorPane
        header={
          <TabsList variant="line">
            <TabsTrigger value="hooks">Hooks · {hooks.length}</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="hooks" className="mt-0 flex flex-col gap-3 outline-none">
          <MomentSearch recordingId={recordingId} />
          <p className="text-xs text-muted-foreground">Ranked by predicted retention</p>
          <HooksPane
            rankedHooks={rankedHooks}
            selectedHookId={selectedHookId}
            pending={pendingHooks}
            recordingId={recordingId}
            onPreview={selectHookAndSeek}
          />
        </TabsContent>
        <TabsContent value="summary" className="mt-0 outline-none">
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            {formatTimestamp(currentTime)}
          </p>
          <SummaryPane summary={summary} pending={pendingSummary} recordingId={recordingId} />
        </TabsContent>
      </EditorPane>
    </Tabs>
  );
}
