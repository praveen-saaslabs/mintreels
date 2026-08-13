import { useMemo } from 'react';
import {
  CAPTION_CHUNK_WORDS,
  EMPTY_SEGMENTS,
  EMPTY_WORDS,
  chunkItems,
  chunkSegmentText,
  findSegmentAtTime,
  findTextCaptionAtTime,
  findWordChunkAtTime,
  groupWordsBySegment,
} from '@/lib/transcript';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';

export type CaptionPlacement = 'top' | 'bottom';

type VideoSubtitlesProps = {
  enabled: boolean;
  placement: CaptionPlacement;
  fontSizePx: number;
  backgroundOpacity: number;
};

export function VideoSubtitles({
  enabled,
  placement,
  fontSizePx,
  backgroundOpacity,
}: Readonly<VideoSubtitlesProps>) {
  const currentTime = useEditorStore((state) => state.video.currentTime);
  const segments = useEditorStore((state) => state.project?.result?.segments) ?? EMPTY_SEGMENTS;
  const words = useEditorStore((state) => state.project?.result?.words) ?? EMPTY_WORDS;
  const wordsBySegment = useMemo(() => groupWordsBySegment(segments, words), [segments, words]);

  if (!enabled) {
    return null;
  }

  const segment = findSegmentAtTime(segments, currentTime);
  if (!segment) {
    return null;
  }

  const segmentWords = wordsBySegment.get(segment.id) ?? EMPTY_WORDS;
  const timedChunks = chunkItems(segmentWords, CAPTION_CHUNK_WORDS);
  const timedChunk = findWordChunkAtTime(timedChunks, currentTime);

  let captionText: string | undefined;
  if (timedChunk && timedChunk.length > 0) {
    captionText = timedChunk.map((word) => word.word).join(' ');
  } else if (segmentWords.length === 0) {
    const textChunks = chunkSegmentText(segment.text, segment.start, segment.end);
    captionText = findTextCaptionAtTime(textChunks, currentTime)?.text;
  }

  if (!captionText) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 z-4 flex justify-center px-[5%]',
        placement === 'top' ? 'top-3' : 'bottom-3',
      )}
      aria-live="polite"
    >
      <p
        className="max-w-[90%] overflow-hidden rounded px-3 py-1.5 text-center leading-relaxed text-ellipsis whitespace-nowrap text-white"
        style={{
          fontSize: `${String(fontSizePx)}px`,
          backgroundColor: `rgba(0, 0, 0, ${String(backgroundOpacity)})`,
        }}
      >
        {captionText}
      </p>
    </div>
  );
}
