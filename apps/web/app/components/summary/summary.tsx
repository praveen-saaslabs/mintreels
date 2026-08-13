import { useMemo } from 'react';
import { HookCard } from '@/components/summary/hook-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPane } from '@/components/video/editor-layout';
import { useRecordingId } from '@/lib/recording-id';
import { formatTimestamp } from '@/lib/time';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type SummaryProps = Readonly<{
  text?: string;
}>;

function rankHooksByScore(hooks: EditorHook[]): EditorHook[] {
  return [...hooks].sort(
    (a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY),
  );
}

export function Summary({ text }: SummaryProps) {
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
          <p className="text-xs text-muted-foreground">Ranked by predicted retention</p>
          {rankedHooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hooks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {rankedHooks.map((hook) => (
                <li key={hook.id}>
                  <HookCard
                    hook={hook}
                    selected={hook.id === selectedHookId}
                    recordingId={recordingId}
                    onPreview={() => {
                      selectHookAndSeek(hook.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="summary" className="mt-0 outline-none">
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            {formatTimestamp(currentTime)}
          </p>
          {summary.length > 0 ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary yet{recordingId ? ` for recording ${String(recordingId)}` : ''}.
            </p>
          )}
        </TabsContent>
      </EditorPane>
    </Tabs>
  );
}
