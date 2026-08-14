import type { Transcript } from '@mintreels/domain';
import { runFfmpeg } from './ffmpeg';
import {
  buildSubtitlesVf,
  CAPTION_PILL_BOX_COLOUR,
  CAPTION_SIDE_MARGIN_RATIO,
} from './video';

export interface BurnSubtitlesInput {
  videoPath: string;
  /** ASS/SRT/VTT path (ASS preferred for PlayRes-correct burn-in). */
  vttPath: string;
  outputPath: string;
  /** Output frame size — used so force_style FontSize matches the video. */
  width?: number;
  height?: number;
}

/** Minimal segment shape for VTT/SRT/ASS export (DB rows or domain segments). */
export interface VttSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string | null;
}

export interface TranscriptToVttOptions {
  /** Inclusive clip window in source timeline ms. Overlapping segments are included. */
  startMs?: number;
  endMs?: number;
  /** When true (default if startMs set), rebase cue times so clip start → 00:00:00.000. */
  rebaseToClip?: boolean;
  /**
   * Max words per cue (player caption chip uses 8). Split long segments into
   * sequential timed cues so burn-in never dumps a whole utterance at once.
   */
  wordsPerCue?: number;
}

export interface TranscriptToAssOptions extends TranscriptToVttOptions {
  /** Must match the rendered frame (e.g. 1080×1920 for 9:16). */
  playResX: number;
  playResY: number;
  fontSize?: number;
  marginV?: number;
  marginL?: number;
  marginR?: number;
}

/** Match editor caption chunks (`CAPTION_CHUNK_WORDS` in the web app). */
export const CAPTION_WORDS_PER_CUE = 8;

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

export function formatVttTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** SRT uses comma decimal separator. */
export function formatSrtTimestamp(ms: number): string {
  return formatVttTimestamp(ms).replace('.', ',');
}

/** ASS dialogue times: H:MM:SS.CC (centiseconds). */
export function formatAssTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const centis = Math.floor((clamped % 1000) / 10);
  return `${String(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

function segmentOverlapsWindow(segment: VttSegment, startMs: number, endMs: number): boolean {
  return segment.endMs > startMs && segment.startMs < endMs;
}

/** Strip WebVTT/HTML voice tags so libass shows the spoken text. */
export function plainCaptionText(text: string): string {
  return text
    .replaceAll(/<v\b[^>]*>/gi, '')
    .replaceAll(/<\/?[a-zA-Z][^>]*>/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function escapeAssDialogueText(text: string): string {
  return plainCaptionText(text)
    .replaceAll('\\', '\\\\')
    .replaceAll('{', '(')
    .replaceAll('}', ')');
}

function resolveCueWindow(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): {
  filtered: VttSegment[];
  origin: number;
  clipDurationMs: number | undefined;
  wordsPerCue: number;
} {
  const windowStart = options?.startMs;
  const windowEnd = options?.endMs;
  const rebase =
    options?.rebaseToClip ?? (windowStart !== undefined && Number.isFinite(windowStart));

  let filtered = [...segments];
  if (windowStart !== undefined && windowEnd !== undefined) {
    filtered = filtered.filter((segment) => segmentOverlapsWindow(segment, windowStart, windowEnd));
  }

  const origin = rebase && windowStart !== undefined ? windowStart : 0;
  const clipDurationMs =
    windowStart !== undefined && windowEnd !== undefined
      ? Math.max(1, windowEnd - windowStart)
      : undefined;
  const wordsPerCue = Math.max(1, options?.wordsPerCue ?? CAPTION_WORDS_PER_CUE);

  return { filtered, origin, clipDurationMs, wordsPerCue };
}

function cueTimes(
  segment: VttSegment,
  origin: number,
  clipDurationMs: number | undefined,
): { start: number; end: number } {
  let start = Math.max(0, segment.startMs - origin);
  let end = Math.max(start + 1, segment.endMs - origin);
  if (clipDurationMs !== undefined) {
    start = Math.min(start, clipDurationMs);
    end = Math.min(end, clipDurationMs);
  }
  if (end <= start) {
    end = start + 1;
    if (clipDurationMs !== undefined && end > clipDurationMs) {
      start = Math.max(0, clipDurationMs - 1);
      end = clipDurationMs;
    }
  }
  return { start, end };
}

export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Clip-relative timed cues: overlap filter → rebase → clamp → split into
 * short sequential chunks (never one giant static block for the whole clip).
 */
export function segmentsToCaptionCues(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): CaptionCue[] {
  const { filtered, origin, clipDurationMs, wordsPerCue } = resolveCueWindow(segments, options);
  const cues: CaptionCue[] = [];

  for (const segment of filtered) {
    const { start, end } = cueTimes(segment, origin, clipDurationMs);
    const text = plainCaptionText(segment.text);
    if (text === '' || end <= start) {
      continue;
    }

    const tokens = text.split(' ').filter((token) => token.length > 0);
    if (tokens.length === 0) {
      continue;
    }

    const chunkCount = Math.ceil(tokens.length / wordsPerCue);
    const duration = end - start;

    for (let index = 0; index < chunkCount; index += 1) {
      const chunkTokens = tokens.slice(index * wordsPerCue, (index + 1) * wordsPerCue);
      const chunkStart = start + (duration * index) / chunkCount;
      const chunkEnd =
        index === chunkCount - 1 ? end : start + (duration * (index + 1)) / chunkCount;
      const cueStart = Math.floor(chunkStart);
      let cueEnd = Math.floor(chunkEnd);
      if (cueEnd <= cueStart) {
        cueEnd = cueStart + 1;
      }
      cues.push({
        startMs: cueStart,
        endMs: cueEnd,
        text: chunkTokens.join(' '),
      });
    }
  }

  return cues;
}

function segmentsToVttCues(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): string {
  const cues = segmentsToCaptionCues(segments, options);

  if (cues.length === 0) {
    return 'WEBVTT\n';
  }

  const blocks = cues.map((cue, index) => {
    return `${String(index + 1)}\n${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}\n${cue.text}`;
  });
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}

function segmentsToSrtCues(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): string {
  const cues = segmentsToCaptionCues(segments, options);

  if (cues.length === 0) {
    return '';
  }

  const blocks = cues.map((cue, index) => {
    return `${String(index + 1)}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}`;
  });
  // Blank line between cues is required — without it libass merges / mis-times events.
  return `${blocks.join('\n\n')}\n`;
}

/**
 * ASS with explicit PlayRes matching the render size.
 * SRT alone defaults to PlayRes 384×288, so FontSize=42 becomes huge on 1080×1920
 * and a bad PlayRes makes BorderStyle=4 draw a box per wrapped word (stacked giants).
 */
export function segmentsToAss(
  segments: readonly VttSegment[],
  options: TranscriptToAssOptions,
): string {
  const playResX = Math.max(1, Math.floor(options.playResX));
  const playResY = Math.max(1, Math.floor(options.playResY));
  // ~2.5–3% of frame height → readable pill, not word-per-line giants.
  const fontSize =
    options.fontSize ?? Math.round(Math.min(56, Math.max(42, playResY * 0.028)));
  const marginV = options.marginV ?? Math.round(playResY * 0.045);
  // ~15% each side → ~70% content width (player caption pill band).
  const marginL = options.marginL ?? Math.round(playResX * CAPTION_SIDE_MARGIN_RATIO);
  const marginR = options.marginR ?? Math.round(playResX * CAPTION_SIDE_MARGIN_RATIO);
  // BorderStyle=4: Outline is box padding; must be >0 or the box collapses.
  const outline = Math.max(8, Math.round(fontSize * 0.2));

  const cues = segmentsToCaptionCues(segments, options);

  // BorderStyle=4 (libass): BackColour is the semi-transparent box fill; OutlineColour
  // matched for force_style parity. Alignment=2 bottom-center.
  // WrapStyle=0 smart-wraps within MarginL/R so cues stay in the ~70% band.
  const styleLine = [
    'Style: Default',
    'DejaVu Sans',
    String(fontSize),
    '&H00FFFFFF', // primary (white)
    '&H000000FF', // secondary
    CAPTION_PILL_BOX_COLOUR, // outline colour (parity with force_style)
    CAPTION_PILL_BOX_COLOUR, // back colour = box fill (libass BorderStyle=4)
    '0', // bold
    '0', // italic
    '0', // underline
    '0', // strikeout
    '100', // scale x
    '100', // scale y
    '0', // spacing
    '0', // angle
    '4', // border style (libass box; honours BackColour alpha)
    String(outline), // outline = box padding
    '0', // shadow
    '2', // alignment (bottom center)
    String(marginL),
    String(marginR),
    String(marginV),
    '1', // encoding
  ].join(',');

  const dialogue = cues.map((cue) => {
    const text = escapeAssDialogueText(cue.text);
    return `Dialogue: 0,${formatAssTimestamp(cue.startMs)},${formatAssTimestamp(cue.endMs)},Default,,0,0,0,,${text}`;
  });

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${String(playResX)}`,
    `PlayResY: ${String(playResY)}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...dialogue,
    '',
  ].join('\n');
}

export function transcriptToVtt(transcript: Transcript, options?: TranscriptToVttOptions): string {
  return segmentsToVttCues(transcript.segments, options);
}

export function segmentsToVtt(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): string {
  return segmentsToVttCues(segments, options);
}

/** SRT is fine for sidecars; prefer ASS (`segmentsToAss`) for FFmpeg burn-in. */
export function segmentsToSrt(
  segments: readonly VttSegment[],
  options?: TranscriptToVttOptions,
): string {
  return segmentsToSrtCues(segments, options);
}

export async function burnSubtitles(input: BurnSubtitlesInput): Promise<void> {
  if (
    input.videoPath.trim() === '' ||
    input.vttPath.trim() === '' ||
    input.outputPath.trim() === ''
  ) {
    throw new Error('videoPath, vttPath, and outputPath are required');
  }

  const width = input.width;
  const height = input.height;
  const vf =
    width !== undefined && height !== undefined
      ? buildSubtitlesVf(input.vttPath, { width, height })
      : buildSubtitlesVf(input.vttPath);

  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.videoPath,
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      input.outputPath,
    ],
  });
}
