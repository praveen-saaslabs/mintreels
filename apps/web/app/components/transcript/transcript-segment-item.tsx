import { memo, type MouseEvent, type Ref } from 'react';
import { SpeakerBadge } from '@/components/transcript/speaker-badge';
import { formatTimestamp } from '@/lib/time';
import { parseWordStart } from '@/lib/transcript';
import { cn } from '@/lib/utils';
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
}: TranscriptSegmentItemProps) {
  function onClick(event: MouseEvent<HTMLButtonElement>) {
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

  return (
    <li ref={isActive ? itemRef : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-lg border border-transparent px-2 py-2 text-left hover:bg-muted/80',
          isActive && 'border-border bg-muted',
        )}
      >
        <span className="mb-1 flex items-center gap-2">
          <time className="font-mono text-xs text-muted-foreground">
            {formatTimestamp(segment.start)}
          </time>
          {segment.speaker ? (
            <SpeakerBadge speaker={segment.speaker} />
          ) : null}
        </span>
        {isActive && words && words.length > 0 ? (
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
                    className={cn('rounded-sm', isCurrentWord && 'bg-primary/15')}
                  >
                    {word.word}
                  </span>
                </span>
              );
            })}
          </span>
        ) : (
          <span className="block text-sm leading-relaxed text-foreground">{segment.text}</span>
        )}
      </button>
    </li>
  );
});
