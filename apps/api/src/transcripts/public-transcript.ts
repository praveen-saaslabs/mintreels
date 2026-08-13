export type PublicTranscriptWord = {
  word: string;
  start: number;
  end: number;
  speaker?: string;
};

export type PublicTranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

export type PublicTranscript = {
  id: number;
  recordingId?: number;
  language: string | null;
  text: string;
  words: PublicTranscriptWord[];
  formats?: { srt?: string; vtt?: string };
  segments: PublicTranscriptSegment[];
  speakers: number;
  audio_seconds: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function msToSeconds(ms: number): number {
  return ms / 1000;
}

type StoredWord = { word: string; startMs: number; endMs: number; speaker?: string };
type StoredFormats = { srt?: string; vtt?: string };

function readTranscriptExtras(raw: unknown): {
  words: StoredWord[];
  formats?: StoredFormats;
  speakerCount?: number;
} {
  if (!isRecord(raw)) {
    return { words: [] };
  }
  const words = Array.isArray(raw.words)
    ? raw.words.filter((item): item is StoredWord => {
        if (!isRecord(item)) {
          return false;
        }
        return (
          typeof item.word === 'string' &&
          typeof item.startMs === 'number' &&
          typeof item.endMs === 'number'
        );
      })
    : [];
  const extras: { words: StoredWord[]; formats?: StoredFormats; speakerCount?: number } = { words };
  if (isRecord(raw.formats)) {
    const formats: StoredFormats = {};
    if (typeof raw.formats.srt === 'string') {
      formats.srt = raw.formats.srt;
    }
    if (typeof raw.formats.vtt === 'string') {
      formats.vtt = raw.formats.vtt;
    }
    if (formats.srt !== undefined || formats.vtt !== undefined) {
      extras.formats = formats;
    }
  }
  if (typeof raw.speakerCount === 'number' && Number.isFinite(raw.speakerCount)) {
    extras.speakerCount = raw.speakerCount;
  }
  return extras;
}

export function toPublicTranscript(
  transcript: {
    id: number;
    recordingId?: number;
    language: string | null;
    text: string | null;
    durationMs: number | null;
    rawResponse: unknown;
  },
  segments: Array<{
    sequence: number;
    startMs: number;
    endMs: number;
    speaker: string | null;
    text: string;
  }>,
): PublicTranscript {
  const extras = readTranscriptExtras(transcript.rawResponse);
  const inferredSpeakers = new Set(
    segments
      .map((segment) => segment.speaker)
      .filter((speaker): speaker is string => Boolean(speaker)),
  );
  const speakers = extras.speakerCount ?? inferredSpeakers.size;

  return {
    id: transcript.id,
    ...(transcript.recordingId !== undefined ? { recordingId: transcript.recordingId } : {}),
    language: transcript.language,
    text: transcript.text ?? '',
    words: extras.words.map((word) => ({
      word: word.word,
      start: msToSeconds(word.startMs),
      end: msToSeconds(word.endMs),
      ...(word.speaker ? { speaker: word.speaker } : {}),
    })),
    ...(extras.formats ? { formats: extras.formats } : {}),
    segments: segments.map((segment) => ({
      id: segment.sequence,
      start: msToSeconds(segment.startMs),
      end: msToSeconds(segment.endMs),
      text: segment.text,
      ...(segment.speaker ? { speaker: segment.speaker } : {}),
    })),
    speakers,
    audio_seconds: transcript.durationMs === null ? null : msToSeconds(transcript.durationMs),
  };
}
