import { useMemo, useRef, useState, type Ref } from 'react';
import { SearchIcon } from 'lucide-react';
import { TranscriptPanelEmptyState } from '@/components/editor/editor-empty-states';
import { SpeakerBadge } from '@/components/transcript/speaker-badge';
import { TranscriptSegmentItem } from '@/components/transcript/transcript-segment-item';
import { useTranscriptFollowScroll } from '@/components/transcript/use-transcript-follow-scroll';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { modKeyLabel, useHotkey } from '@/hooks/use-hotkey';
import { useRecordingId } from '@/lib/recording-id';
import {
  ALL_SPEAKERS,
  EMPTY_SEGMENTS,
  EMPTY_WORDS,
  findSegmentAtTime,
  findWordAtTime,
  groupWordsBySegment,
  matchesSearch,
  resolveSpeakerFilter,
  uniqueSpeakers,
} from '@/lib/transcript';
import { useEditorStore, type EditorSegment, type EditorWord } from '@/stores/editor-store';

function activeWordKey(word: EditorWord | undefined, segmentId: number | undefined): string | null {
  if (word) {
    return `${String(word.start)}:${String(word.end)}`;
  }
  if (segmentId !== undefined) {
    return `segment:${String(segmentId)}`;
  }
  return null;
}

function TranscriptListContent({
  pending,
  recordingId,
  segments,
  visibleSegments,
  visibleActiveSegmentId,
  activeSegmentWords,
  activeWord,
  seek,
  activeWordRef,
  activeItemRef,
}: Readonly<{
  pending: boolean;
  recordingId: number | undefined;
  segments: readonly EditorSegment[];
  visibleSegments: readonly EditorSegment[];
  visibleActiveSegmentId: number | undefined;
  activeSegmentWords: readonly EditorWord[];
  activeWord: EditorWord | undefined;
  seek: (time: number) => void;
  activeWordRef: Ref<HTMLSpanElement>;
  activeItemRef: Ref<HTMLLIElement>;
}>) {
  if (segments.length === 0) {
    if (pending) {
      return <TranscriptPanelEmptyState />;
    }
    return (
      <p className="text-sm text-muted-foreground">
        No transcript yet{recordingId ? ` for recording ${String(recordingId)}` : ''}.
      </p>
    );
  }

  if (visibleSegments.length === 0) {
    return <p className="text-sm text-muted-foreground">No matching transcript lines.</p>;
  }

  return (
    <ol className="space-y-2">
      {visibleSegments.map((segment) => {
        const isActive = segment.id === visibleActiveSegmentId;

        return (
          <TranscriptSegmentItem
            key={segment.id}
            segment={segment}
            isActive={isActive}
            words={isActive ? activeSegmentWords : undefined}
            activeWordStart={isActive ? activeWord?.start : undefined}
            activeWordEnd={isActive ? activeWord?.end : undefined}
            seek={seek}
            activeWordRef={activeWordRef}
            itemRef={activeItemRef}
          />
        );
      })}
    </ol>
  );
}

export function Transcriptions({ pending = false }: Readonly<{ pending?: boolean }>) {
  const recordingId = useRecordingId();
  const segments = useEditorStore((state) => state.project?.result?.segments ?? EMPTY_SEGMENTS);
  const words = useEditorStore((state) => state.project?.result?.words ?? EMPTY_WORDS);
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const seekEpoch = useEditorStore((state) => state.video.seekEpoch);
  const seek = useEditorStore((state) => state.seek);
  const [speakerFilter, setSpeakerFilter] = useState(ALL_SPEAKERS);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasTranscript = segments.length > 0;

  const focusSearch = () => {
    const input = searchInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  };

  useHotkey({
    key: 'k',
    mod: true,
    enabled: hasTranscript,
    onKeyDown: focusSearch,
  });

  useHotkey({
    key: '/',
    enabled: hasTranscript,
    ignoreWhenEditable: true,
    onKeyDown: focusSearch,
  });

  const speakers = useMemo(() => uniqueSpeakers(segments), [segments]);
  const wordsBySegment = useMemo(() => groupWordsBySegment(segments, words), [segments, words]);
  const effectiveSpeaker = resolveSpeakerFilter(speakerFilter, speakers);

  const visibleSegments = useMemo(
    () =>
      segments.filter((segment) => {
        if (effectiveSpeaker !== ALL_SPEAKERS && segment.speaker !== effectiveSpeaker) {
          return false;
        }
        return matchesSearch(segment.text, search);
      }),
    [segments, effectiveSpeaker, search],
  );

  const activeSegment = findSegmentAtTime(segments, currentTime);
  const visibleActiveSegment =
    activeSegment !== undefined &&
    visibleSegments.some((segment) => segment.id === activeSegment.id)
      ? activeSegment
      : undefined;
  const activeSegmentWords = visibleActiveSegment
    ? (wordsBySegment.get(visibleActiveSegment.id) ?? EMPTY_WORDS)
    : EMPTY_WORDS;
  const activeWord = visibleActiveSegment
    ? findWordAtTime(activeSegmentWords, currentTime)
    : undefined;
  const followKey = visibleActiveSegment
    ? activeWordKey(activeWord, visibleActiveSegment.id)
    : null;
  const { listRef, activeWordRef, activeItemRef, pauseFollow } = useTranscriptFollowScroll(
    followKey,
    seekEpoch,
  );

  return (
    <section
      className="glass-panel glass-materialize m-1.5 flex h-[calc(100%-0.75rem)] min-h-0 w-[calc(100%-0.75rem)] flex-col overflow-hidden"
      style={{ animationDelay: '40ms' }}
    >
      <header className="glass-pane-header shrink-0 space-y-2 select-none px-3 py-2.5">
        <h2 className="text-sm font-medium tracking-[-0.01em] text-foreground">Transcriptions</h2>
        {hasTranscript ? (
          <>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by speaker">
              <Badge
                variant={effectiveSpeaker === ALL_SPEAKERS ? 'default' : 'outline'}
                className="h-6 cursor-pointer"
                render={
                  <button
                    type="button"
                    aria-pressed={effectiveSpeaker === ALL_SPEAKERS}
                    onClick={() => setSpeakerFilter(ALL_SPEAKERS)}
                  />
                }
              >
                All Speakers
              </Badge>
              {speakers.map((speaker) => {
                const selected = effectiveSpeaker === speaker;
                return (
                  <SpeakerBadge
                    key={speaker}
                    speaker={speaker}
                    selected={selected}
                    className="h-6 cursor-pointer"
                    render={
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSpeakerFilter(speaker)}
                      />
                    }
                  />
                );
              })}
            </div>
            <div className="relative">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transcript"
                aria-label="Search transcript"
                className="select-text pl-8 pr-14"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                {modKeyLabel()}K /
              </span>
            </div>
          </>
        ) : null}
      </header>
      <div
        ref={listRef}
        className="glass-pane-body min-h-0 flex-1 select-text overflow-auto p-3"
        onWheel={pauseFollow}
        onTouchMove={pauseFollow}
      >
        <TranscriptListContent
          pending={pending}
          recordingId={recordingId}
          segments={segments}
          visibleSegments={visibleSegments}
          visibleActiveSegmentId={visibleActiveSegment?.id}
          activeSegmentWords={activeSegmentWords}
          activeWord={activeWord}
          seek={seek}
          activeWordRef={activeWordRef}
          activeItemRef={activeItemRef}
        />
      </div>
    </section>
  );
}
