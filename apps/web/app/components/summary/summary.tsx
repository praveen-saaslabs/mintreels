import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HooksListEmptyState,
  SummaryTextEmptyState,
} from '@/components/editor/editor-empty-states';
import { AskMint } from '@/components/summary/moment-search';
import { HookCard } from '@/components/summary/hook-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPane } from '@/components/video/editor-layout';
import { parseEditorDeepLink } from '@/lib/editor-deep-link';
import { hookSequenceLabel, rankHooksByScore } from '@/lib/hook-rank';
import { useRecordingId } from '@/lib/recording-id';
import { useEditorStore, type EditorHook } from '@/stores/editor-store';

type SummaryProps = Readonly<{
  text?: string;
  pendingHooks?: boolean;
  pendingSummary?: boolean;
}>;

/** Turn paragraph or newline/bullet text into display bullets. */
function summaryToBullets(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s+/, '').trim())
    .filter((line) => line.length > 0);
  if (lines.length > 1) return lines;

  const bullets: string[] = [];
  let start = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char !== '.' && char !== '!' && char !== '?') continue;
    const next = trimmed[i + 1];
    if (next && next !== ' ' && next !== '\n') continue;
    const sentence = trimmed.slice(start, i + 1).trim();
    if (sentence.length > 0) bullets.push(sentence);
    start = i + 1;
  }
  const rest = trimmed.slice(start).trim();
  if (rest.length > 0) bullets.push(rest);
  return bullets.length > 0 ? bullets : [trimmed];
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
  const selectedItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedHookId]);

  if (rankedHooks.length > 0) {
    return (
      <ul className="flex flex-col gap-2.5">
        {rankedHooks.map((hook, index) => (
          <li key={hook.id} ref={hook.id === selectedHookId ? selectedItemRef : undefined}>
            <HookCard
              hook={hook}
              sequenceLabel={hookSequenceLabel(index)}
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
  const bullets = summaryToBullets(summary);

  if (bullets.length > 0) {
    return (
      <ul className="list-disc space-y-2.5 pl-4 text-sm leading-relaxed text-foreground">
        {bullets.map((bullet, index) => (
          <li key={`${String(index)}-${bullet.slice(0, 48)}`}>{bullet}</li>
        ))}
      </ul>
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
  const [searchParams] = useSearchParams();
  const initialTab = parseEditorDeepLink(searchParams).tab;
  const hooks = useEditorStore((state) => state.hooks);
  const selectedHookId = useEditorStore((state) => state.selectedHookId);
  const selectHookAndSeek = useEditorStore((state) => state.selectHookAndSeek);
  const storeSummary = useEditorStore((state) => state.project?.result?.text ?? '');
  const summary = (text?.trim() || storeSummary).trim();
  const rankedHooks = useMemo(() => rankHooksByScore(hooks), [hooks]);

  return (
    <Tabs defaultValue={initialTab} className="flex h-full min-h-0 w-full flex-col gap-0">
      <EditorPane
        header={
          <TabsList variant="line">
            <TabsTrigger value="ask" className="gap-1.5">
              <Sparkles className="size-3.5 text-mr-acc" aria-hidden />
              Ask Mint
            </TabsTrigger>
            <TabsTrigger value="hooks">Hooks · {hooks.length}</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent
          value="ask"
          keepMounted
          className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
        >
          <AskMint recordingId={recordingId} />
        </TabsContent>
        <TabsContent
          value="hooks"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-auto outline-none"
        >
          <p className="text-xs text-muted-foreground">Ranked by predicted retention</p>
          <HooksPane
            rankedHooks={rankedHooks}
            selectedHookId={selectedHookId}
            pending={pendingHooks}
            recordingId={recordingId}
            onPreview={selectHookAndSeek}
          />
        </TabsContent>
        <TabsContent value="summary" className="mt-0 min-h-0 flex-1 overflow-auto outline-none">
          <SummaryPane summary={summary} pending={pendingSummary} recordingId={recordingId} />
        </TabsContent>
      </EditorPane>
    </Tabs>
  );
}
