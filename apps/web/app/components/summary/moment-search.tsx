import { useMutation } from '@tanstack/react-query';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';

import { MomentCard } from '@/components/summary/moment-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, type AskMomentsResponse, type MomentCandidate } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

const SUGGESTIONS = [
  'What did they say about pricing?',
  'Find the best moment',
  'When do they mention the product demo?',
] as const;

const THINKING_LINES = [
  'Mint is thinking',
  'Reading the transcript',
  'Finding the magic',
] as const;

type AskTurn =
  | { id: string; query: string; status: 'pending' }
  | { id: string; query: string; status: 'error'; message: string }
  | { id: string; query: string; status: 'done'; result: AskMomentsResponse };

function momentKey(turnId: string, moment: MomentCandidate): string {
  return `${turnId}:${String(moment.startMs)}:${String(moment.endMs)}`;
}

function askErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'TRANSCRIPT_INDEX_NOT_READY') {
      return 'Re-run processing to index this transcript, then try again.';
    }
    if (error.code === 'TRANSCRIPT_REQUIRED') {
      return 'Transcript is not ready yet.';
    }
    if (error.status === 400) {
      return 'Ask something a bit longer (at least 3 characters).';
    }
    return error.code;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ask failed';
}

function newTurnId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ask-${String(Date.now())}`;
}

function MintThinkingBubble() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % THINKING_LINES.length);
    }, 2400);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const line = THINKING_LINES[lineIndex] ?? THINKING_LINES[0];

  return (
    <div
      className={cn(
        'mint-thinking glass-materialize mr-auto flex max-w-[95%] items-center gap-2.5',
        'rounded-2xl rounded-bl-md border border-[color-mix(in_oklch,var(--mr-acc)_28%,var(--border))]',
        'bg-[color-mix(in_oklch,var(--mr-acc)_9%,var(--muted))] px-3 py-2.5',
      )}
      role="status"
      aria-live="polite"
      aria-label="Mint is thinking"
    >
      <span className="mint-thinking-aura" aria-hidden />
      <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden>
        <Sparkles className="mint-thinking-sparkle size-3.5 text-mr-acc" />
        <span className="mint-thinking-particle mint-thinking-particle--a" />
        <span className="mint-thinking-particle mint-thinking-particle--b" />
        <span className="mint-thinking-particle mint-thinking-particle--c" />
      </span>
      <span key={line} className="mint-thinking-line flex items-center gap-1.5">
        <span className="mint-thinking-text text-sm font-medium tracking-[-0.01em]">{line}</span>
        <span className="flex items-center gap-0.5 pb-0.5" aria-hidden>
          <span className="mint-thinking-dot" />
          <span className="mint-thinking-dot" />
          <span className="mint-thinking-dot" />
        </span>
      </span>
    </div>
  );
}

function EmptyAskState({
  disabled,
  onSuggestion,
}: Readonly<{
  disabled: boolean;
  onSuggestion: (text: string) => void;
}>) {
  return (
    <div className="flex flex-col gap-3 px-0.5 py-1">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Ask about this video or find a clip</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Mint answers from the transcript or finds moments you can preview and cut.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => {
              onSuggestion(suggestion);
            }}
            className={cn(
              'rounded-md border border-border bg-background/70 px-2.5 py-2 text-left text-[12px]',
              'text-muted-foreground transition-colors hover:border-mr-acc hover:text-foreground',
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function AskTurnView({
  turn,
  recordingId,
  selectedKey,
  onSelectMoment,
}: Readonly<{
  turn: AskTurn;
  recordingId: number | undefined;
  selectedKey: string | null;
  onSelectMoment: (key: string, startMs: number) => void;
}>) {
  const moments =
    turn.status === 'done' && turn.result.kind === 'moments' ? turn.result.moments : [];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-mr-acc px-3 py-2 text-sm text-[var(--mr-accfg)]">
        {turn.query}
      </div>

      {turn.status === 'pending' ? <MintThinkingBubble /> : null}

      {turn.status === 'error' ? (
        <div className="mr-auto max-w-[95%] rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="text-sm text-destructive" role="alert">
            {turn.message}
          </p>
        </div>
      ) : null}

      {turn.status === 'done' && turn.result.kind === 'answer' ? (
        <div className="mr-auto max-w-[95%] space-y-1 rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-mr-acc uppercase">Mint</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {turn.result.text}
          </p>
        </div>
      ) : null}

      {turn.status === 'done' && turn.result.kind === 'reject' ? (
        <div className="mr-auto max-w-[95%] space-y-1 rounded-2xl rounded-bl-md border border-dashed border-border px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Mint
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{turn.result.text}</p>
        </div>
      ) : null}

      {turn.status === 'done' && turn.result.kind === 'moments' && moments.length === 0 ? (
        <div className="mr-auto max-w-[95%] rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-sm text-muted-foreground">No matching moments.</p>
        </div>
      ) : null}

      {moments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-mr-acc uppercase">
            Moments · {moments.length}
          </p>
          <ul className="flex flex-col gap-2.5">
            {moments.map((moment) => {
              const key = momentKey(turn.id, moment);
              return (
                <li key={key}>
                  <MomentCard
                    moment={moment}
                    selected={selectedKey === key}
                    recordingId={recordingId}
                    onPreview={() => {
                      onSelectMoment(key, moment.startMs);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Ask Mint panel — continuous thread; each send → `api.askMoments`, switch on `kind`. */
export function AskMint({ recordingId }: Readonly<{ recordingId: number | undefined }>) {
  const [query, setQuery] = useState('');
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const inputId = useId();
  const threadEndRef = useRef<HTMLDivElement>(null);
  const seek = useEditorStore((state) => state.seek);

  const askMutation = useMutation({
    mutationFn: async ({ turnId, text }: { turnId: string; text: string }) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      const result = await api.askMoments(recordingId, { query: text });
      return { turnId, result };
    },
    onSuccess: ({ turnId, result }) => {
      setTurns((prev) =>
        prev.map((turn) => (turn.id === turnId ? { ...turn, status: 'done', result } : turn)),
      );
    },
    onError: (error, { turnId }) => {
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? { id: turn.id, query: turn.query, status: 'error', message: askErrorMessage(error) }
            : turn,
        ),
      );
    },
  });
  const resetAskMutation = askMutation.reset;

  // New recording → fresh thread (keepMounted survives tab toggles, not route changes).
  useEffect(() => {
    setTurns([]);
    setQuery('');
    setSelectedKey(null);
    resetAskMutation();
  }, [recordingId, resetAskMutation]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  function runAsk(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || recordingId == null || askMutation.isPending) {
      return;
    }
    const turnId = newTurnId();
    setTurns((prev) => [...prev, { id: turnId, query: trimmed, status: 'pending' }]);
    setQuery('');
    setSelectedKey(null);
    askMutation.mutate({ turnId, text: trimmed });
  }

  function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    runAsk(query);
  }

  const canSubmit = recordingId != null && query.trim().length >= 3 && !askMutation.isPending;
  const hasTurns = turns.length > 0;

  return (
    <section aria-label="Ask Mint" className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--mr-acc)_16%,transparent)] text-mr-acc">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-foreground">Ask Mint</h3>
          <p className="text-xs text-muted-foreground">
            Ask questions or find your personalized moments to cut.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasTurns ? (
          <EmptyAskState
            disabled={recordingId == null || askMutation.isPending}
            onSuggestion={runAsk}
          />
        ) : (
          <div
            className="flex flex-col gap-4 pb-1"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {turns.map((turn) => (
              <AskTurnView
                key={turn.id}
                turn={turn}
                recordingId={recordingId}
                selectedKey={selectedKey}
                onSelectMoment={(key, startMs) => {
                  setSelectedKey(key);
                  seek(startMs / 1000);
                }}
              />
            ))}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-[var(--glass-border-subtle)] pt-3"
        onSubmit={onSubmit}
      >
        <label htmlFor={inputId} className="sr-only">
          Ask Mint
        </label>
        <Input
          id={inputId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder={
            hasTurns ? 'Ask Mint anything else…' : 'e.g. "what did they say about pricing?"'
          }
          aria-label="Ask Mint about this video"
          disabled={recordingId == null || askMutation.isPending}
          className="h-9 flex-1 rounded-full px-3.5"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!canSubmit}
          aria-label={askMutation.isPending ? 'Thinking' : 'Send ask'}
          className="rounded-full bg-mr-acc text-[var(--mr-accfg)] hover:bg-[color-mix(in_oklch,var(--mr-acc)_90%,black)]"
        >
          {askMutation.isPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
    </section>
  );
}

/** @deprecated Prefer `AskMint` — kept for rule/doc path stability. */
export const MomentSearch = AskMint;
