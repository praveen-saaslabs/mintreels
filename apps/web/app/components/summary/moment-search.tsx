import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { MomentCard } from '@/components/summary/moment-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, type AskMomentsResponse, type MomentCandidate } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

function momentKey(moment: MomentCandidate): string {
  return `${String(moment.startMs)}:${String(moment.endMs)}`;
}

function askErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'TRANSCRIPT_INDEX_NOT_READY') {
      return 'Re-run processing to index this transcript.';
    }
    if (error.code === 'TRANSCRIPT_REQUIRED') {
      return 'Transcript is not ready yet.';
    }
    return error.code;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ask failed';
}

export function MomentSearch({ recordingId }: Readonly<{ recordingId: number | undefined }>) {
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const seek = useEditorStore((state) => state.seek);

  const askMutation = useMutation({
    mutationFn: async (text: string) => {
      if (recordingId == null) {
        throw new Error('Invalid recording');
      }
      return api.askMoments(recordingId, { query: text });
    },
  });

  const result: AskMomentsResponse | undefined = askMutation.data;
  const moments = result?.kind === 'moments' ? result.moments : [];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 3 || recordingId == null || askMutation.isPending) {
      return;
    }
    setSelectedKey(null);
    askMutation.mutate(trimmed);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form className="flex gap-2" onSubmit={onSubmit}>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder='Ask the video or find a clip… e.g. "what did they say about pricing?"'
          aria-label="Ask the transcript or find a clip"
          disabled={recordingId == null || askMutation.isPending}
        />
        <Button type="submit" size="sm" disabled={recordingId == null || query.trim().length < 3 || askMutation.isPending}>
          {askMutation.isPending ? 'Thinking…' : 'Ask'}
        </Button>
      </form>
      {askMutation.isError ? (
        <p className="text-xs text-destructive">{askErrorMessage(askMutation.error)}</p>
      ) : null}
      {result?.kind === 'answer' ? (
        <p className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-sm leading-relaxed text-foreground">
          {result.text}
        </p>
      ) : null}
      {result?.kind === 'reject' ? (
        <p
          className={cn(
            'rounded-md border border-border px-2.5 py-2 text-sm leading-relaxed text-muted-foreground',
          )}
        >
          {result.text}
        </p>
      ) : null}
      {result?.kind === 'moments' && moments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matching moments.</p>
      ) : null}
      {moments.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {moments.map((moment) => {
            const key = momentKey(moment);
            return (
              <li key={key}>
                <MomentCard
                  moment={moment}
                  selected={selectedKey === key}
                  recordingId={recordingId}
                  onPreview={() => {
                    setSelectedKey(key);
                    seek(moment.startMs / 1000);
                  }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
