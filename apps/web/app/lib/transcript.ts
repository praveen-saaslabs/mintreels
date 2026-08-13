import type { EditorSegment, EditorWord } from '@/stores/editor-store';

export const ALL_SPEAKERS = 'all';

export const EMPTY_SEGMENTS: EditorSegment[] = [];
export const EMPTY_WORDS: EditorWord[] = [];

export function findSegmentAtTime(
  segments: readonly EditorSegment[],
  time: number,
): EditorSegment | undefined {
  return (
    segments.find((segment) => time >= segment.start && time < segment.end) ??
    segments.find((segment) => time === segment.end)
  );
}

export function findWordAtTime(words: readonly EditorWord[], time: number): EditorWord | undefined {
  const active = words.find((word) => time >= word.start && time < word.end);
  if (active) {
    return active;
  }

  const last = words.at(-1);
  if (last && time === last.end) {
    return last;
  }

  return undefined;
}

export function groupWordsBySegment(
  segments: readonly EditorSegment[],
  words: readonly EditorWord[],
): Map<number, EditorWord[]> {
  const grouped = new Map<number, EditorWord[]>();
  for (const segment of segments) {
    grouped.set(segment.id, []);
  }

  if (segments.length === 0 || words.length === 0) {
    return grouped;
  }

  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  const sortedWords = [...words].sort((a, b) => a.start - b.start);

  let segmentIndex = 0;
  for (const word of sortedWords) {
    let segment = sortedSegments[segmentIndex];
    while (segment && word.start >= segment.end) {
      segmentIndex += 1;
      segment = sortedSegments[segmentIndex];
    }

    if (!segment) {
      break;
    }

    if (word.start >= segment.start && word.start < segment.end) {
      grouped.get(segment.id)?.push(word);
    }
  }

  return grouped;
}

export function uniqueSpeakers(segments: readonly EditorSegment[]): string[] {
  const speakers = new Set<string>();
  for (const segment of segments) {
    const speaker = segment.speaker.trim();
    if (speaker) speakers.add(speaker);
  }
  return [...speakers].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function resolveSpeakerFilter(requested: string, speakers: readonly string[]): string {
  if (requested === ALL_SPEAKERS || speakers.includes(requested)) {
    return requested;
  }
  return ALL_SPEAKERS;
}

export function formatSpeakerLabel(speaker: string): string {
  const match = /^speaker[_-]?(\d+)$/i.exec(speaker.trim());
  if (match) return `Speaker ${match[1]}`;
  return speaker;
}

export function matchesSearch(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}

export const CAPTION_CHUNK_WORDS = 8;

export function chunkItems<T>(items: readonly T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }
  const chunkSize = size < 1 ? items.length : size;
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push([...items.slice(index, index + chunkSize)]);
  }
  return chunks;
}

export function findWordChunkAtTime(
  chunks: readonly EditorWord[][],
  time: number,
): EditorWord[] | undefined {
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const first = chunk?.[0];
    const last = chunk?.at(-1);
    if (!chunk || !first || !last) {
      continue;
    }
    const nextStart = chunks[index + 1]?.[0]?.start;
    const end = nextStart ?? last.end;
    if (time >= first.start && time < end) {
      return chunk;
    }
    if (nextStart === undefined && time === last.end) {
      return chunk;
    }
  }

  return undefined;
}

export type TextCaptionChunk = {
  text: string;
  start: number;
  end: number;
};

export function chunkSegmentText(
  text: string,
  start: number,
  end: number,
  size = CAPTION_CHUNK_WORDS,
): TextCaptionChunk[] {
  const tokens = text.trim().split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return [];
  }

  const groups = chunkItems(tokens, size);
  const duration = Math.max(0, end - start);
  const count = groups.length;
  return groups.map((group, index) => {
    const chunkStart = start + (duration * index) / count;
    const chunkEnd = index === count - 1 ? end : start + (duration * (index + 1)) / count;
    return { text: group.join(' '), start: chunkStart, end: chunkEnd };
  });
}

export function findTextCaptionAtTime(
  chunks: readonly TextCaptionChunk[],
  time: number,
): TextCaptionChunk | undefined {
  return (
    chunks.find((chunk) => time >= chunk.start && time < chunk.end) ??
    chunks.find((chunk) => time === chunk.end)
  );
}

export function parseWordStart(value: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }

  const start = Number(value);
  if (!Number.isFinite(start) || start < 0) {
    return undefined;
  }

  return start;
}
