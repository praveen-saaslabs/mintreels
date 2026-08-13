import { memo, useEffect, useState, type KeyboardEvent, type MouseEvent, type Ref } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { SpeakerBadge } from '@/components/transcript/speaker-badge';
import { buttonVariants } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatTimestamp } from '@/lib/time';
import { parseWordStart } from '@/lib/transcript';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import type { EditorSegment, EditorWord } from '@/stores/editor-store';

type TranscriptSegmentItemProps = {
  segment: EditorSegment;
  isActive: boolean;
  words: readonly EditorWord[] | undefined;
  activeWordStart: number | undefined;
  activeWordEnd: number | undefined;
  seek: (time: number) => void;
  activeWordRef: Ref<HTMLSpanElement>;
  itemRef: Ref<HTMLLIElement>;
  recordingId?: number | undefined;
  canOverdub?: boolean;
  overdubBusy?: boolean;
  isOverdubTarget?: boolean;
  onSaveText?: (segmentId: number, text: string) => Promise<void>;
  onApplyOverdub?: (segmentId: number, voiceId: string) => Promise<void>;
};

export const TranscriptSegmentItem = memo(function TranscriptSegmentItem({
  segment,
  isActive,
  words,
  activeWordStart,
  activeWordEnd,
  seek,
  activeWordRef,
  itemRef,
  recordingId,
  canOverdub = false,
  overdubBusy = false,
  isOverdubTarget = false,
  onSaveText,
  onApplyOverdub,
}: TranscriptSegmentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(segment.text);
  const [voiceId, setVoiceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const voicesQuery = useQuery({
    queryKey: queryKeys.voices.list(),
    queryFn: () => api.getVoices(),
    enabled: editing && canOverdub && recordingId != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!editing) {
      setDraft(segment.text);
    }
  }, [segment.text, editing]);

  useEffect(() => {
    if (!editing || voiceId !== '' || !voicesQuery.data?.length) {
      return;
    }
    const first = voicesQuery.data[0];
    if (first) {
      setVoiceId(first.id);
    }
  }, [editing, voiceId, voicesQuery.data]);

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (editing) {
      return;
    }
    const target = event.target;
    if (target instanceof Element) {
      const wordStart = parseWordStart(
        target.closest('[data-word-start]')?.getAttribute('data-word-start') ?? null,
      );
      if (wordStart !== undefined) {
        seek(wordStart);
        return;
      }
    }

    seek(segment.start);
  }

  function onEditClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setEditing(true);
    setError(undefined);
  }

  function onCancel(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setEditing(false);
    setDraft(segment.text);
    setError(undefined);
  }

  async function onSave(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!onSaveText || draft.trim() === '') {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onSaveText(segment.id, draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onApply(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!onSaveText || !onApplyOverdub || voiceId.trim() === '') {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (draft.trim() !== segment.text.trim()) {
        await onSaveText(segment.id, draft.trim());
      }
      await onApplyOverdub(segment.id, voiceId.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Overdub failed');
    } finally {
      setBusy(false);
    }
  }

  function stopKeyPropagation(event: KeyboardEvent<HTMLTextAreaElement | HTMLSelectElement>) {
    event.stopPropagation();
  }

  return (
    <li ref={isActive ? itemRef : undefined}>
      <div
        className={cn(
          'w-full rounded border border-transparent px-2 py-2 text-left transition-colors',
          isActive || isOverdubTarget
            ? 'border-mr-acc bg-transcript-active shadow-[var(--glass-highlight)]'
            : 'hover:bg-[var(--glass-bg)]',
        )}
      >
        <span className="mb-1 flex items-center gap-2">
          <button type="button" onClick={onClick} className="font-mono text-xs text-muted-foreground">
            <time>{formatTimestamp(segment.start)}</time>
          </button>
          {segment.speaker ? <SpeakerBadge speaker={segment.speaker} /> : null}
          {isOverdubTarget && overdubBusy ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Applying voice
            </span>
          ) : null}
          {canOverdub && !editing ? (
            <button
              type="button"
              onClick={onEditClick}
              className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'ml-auto')}
            >
              Edit
            </button>
          ) : null}
        </span>

        {editing ? (
          <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={stopKeyPropagation}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm leading-relaxed"
              disabled={busy || overdubBusy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-7 min-w-[10rem] rounded-md border border-input bg-transparent px-2 text-xs"
                value={voiceId}
                disabled={busy || overdubBusy || voicesQuery.isLoading}
                onChange={(event) => setVoiceId(event.target.value)}
                onKeyDown={stopKeyPropagation}
                aria-label="Overdub voice"
              >
                {(voicesQuery.data ?? []).map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || overdubBusy || draft.trim() === ''}
                onClick={(event) => void onSave(event)}
                className={buttonVariants({ variant: 'outline', size: 'xs' })}
              >
                Save text
              </button>
              <button
                type="button"
                disabled={busy || overdubBusy || voiceId.trim() === '' || draft.trim() === ''}
                onClick={(event) => void onApply(event)}
                className={buttonVariants({ variant: 'default', size: 'xs' })}
              >
                {busy || overdubBusy ? 'Working…' : 'Apply voice'}
              </button>
              <button
                type="button"
                disabled={busy || overdubBusy}
                onClick={onCancel}
                className={buttonVariants({ variant: 'ghost', size: 'xs' })}
              >
                Cancel
              </button>
            </div>
            {error ? <p className="text-xs text-[var(--mr-bad)]">{error}</p> : null}
          </div>
        ) : isActive && words && words.length > 0 ? (
          <button type="button" onClick={onClick} className="block w-full text-left">
            <span className="block text-sm leading-relaxed text-foreground">
              {words.map((word, index) => {
                const isCurrentWord =
                  activeWordStart !== undefined &&
                  activeWordEnd !== undefined &&
                  word.start === activeWordStart &&
                  word.end === activeWordEnd;

                return (
                  <span key={`${String(word.start)}-${String(index)}`}>
                    {index > 0 ? ' ' : null}
                    <span
                      ref={isCurrentWord ? activeWordRef : undefined}
                      data-word-start={String(word.start)}
                      aria-current={isCurrentWord ? 'true' : undefined}
                      className={cn('rounded', isCurrentWord && 'bg-transcript-word')}
                    >
                      {word.word}
                    </span>
                  </span>
                );
              })}
            </span>
          </button>
        ) : (
          <button type="button" onClick={onClick} className="block w-full text-left">
            <span className="block text-sm leading-relaxed text-foreground">{segment.text}</span>
          </button>
        )}
      </div>
    </li>
  );
});
