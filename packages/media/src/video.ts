import type { ClipAspectRatio } from '@mintreels/domain';
import { runFfmpeg } from './ffmpeg';

export interface TrimVideoInput {
  inputPath: string;
  outputPath: string;
  startMs: number;
  endMs: number;
}

export interface CropVideoInput {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ResizeVideoInput {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
}

export interface EncodeVideoInput {
  inputPath: string;
  outputPath: string;
}

/** Fill = center-crop then scale (object-cover). Fit = full frame + blurred pad (object-contain). */
export type AspectFitMode = 'fill' | 'fit';

export interface RenderClipVideoInput {
  inputPath: string;
  outputPath: string;
  startMs: number;
  endMs: number;
  aspectRatio: ClipAspectRatio;
  /** Default fit (safe for any layout). Fill is opt-in center crop. */
  fitMode?: AspectFitMode;
  /** Optional SRT/VTT path; burned in the same encode pass when set. */
  vttPath?: string;
}

const TARGET_SIZE: Record<ClipAspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

/** Bundled in docker/Dockerfile.dev (Alpine font-dejavu). */
const SUBTITLE_FONTS_DIR = '/usr/share/fonts/dejavu';

export interface SubtitlesVfOptions {
  /** Output frame size — pair with ASS PlayRes (or original_size for SRT). */
  width?: number;
  height?: number;
}

/**
 * Player caption pill default: `rgba(0, 0, 0, 0.55)` (see video-player DEFAULT_CAPTION_STYLE).
 * ASS &HAABBGGRR — AA=00 opaque, AA=FF fully transparent.
 * AA = round((1 - 0.55) * 255) = 0x73 → ~55% opaque black.
 *
 * BorderStyle=4 (libass) draws a box from BackColour and honours alpha;
 * BorderStyle=3 often renders fully opaque regardless of AA.
 */
export const CAPTION_PILL_BG_OPACITY = 0.55;
export const CAPTION_PILL_BOX_COLOUR = '&H73000000';

/** Side margins ≈15% each → ~70% content width (matches player pill band). */
export const CAPTION_SIDE_MARGIN_RATIO = 0.15;

/**
 * force_style FontSize is relative to ASS PlayResY.
 * Prefer ASS from `segmentsToAss` (PlayRes = frame size) so FontSize≈48–56 is correct.
 * Without height (raw SRT, PlayResY=288), use a small FontSize to avoid giant stacked words.
 */
function subtitleForceStyle(options?: { width?: number; height?: number }): string {
  const height = options?.height;
  const width = options?.width;
  const hasFrameHeight = height !== undefined && height > 0;
  const playResY = hasFrameHeight ? height : 288;
  const playResX = width !== undefined && width > 0 ? width : 384;
  const fontSize = hasFrameHeight
    ? Math.round(Math.min(56, Math.max(42, height * 0.028)))
    : 16;
  const marginV = Math.round(playResY * 0.045);
  // ~70% content band; Outline>0 pads the BorderStyle=4 box.
  const marginLR = Math.round(playResX * CAPTION_SIDE_MARGIN_RATIO);
  const outline = hasFrameHeight ? Math.max(8, Math.round(fontSize * 0.2)) : 4;
  return [
    'FontName=DejaVu Sans',
    `FontSize=${String(fontSize)}`,
    'PrimaryColour=&H00FFFFFF',
    `OutlineColour=${CAPTION_PILL_BOX_COLOUR}`,
    `BackColour=${CAPTION_PILL_BOX_COLOUR}`,
    'BorderStyle=4',
    `Outline=${String(outline)}`,
    'Shadow=0',
    'Alignment=2',
    `MarginV=${String(marginV)}`,
    `MarginL=${String(marginLR)}`,
    `MarginR=${String(marginLR)}`,
  ].join(',');
}

function assertTrimRange(startMs: number, endMs: number): void {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) {
    throw new Error('startMs and endMs must be finite with endMs greater than startMs');
  }
}

function assertPaths(inputPath: string, outputPath: string): void {
  if (inputPath.trim() === '' || outputPath.trim() === '') {
    throw new Error('inputPath and outputPath are required');
  }
}

/** Escape a filesystem path for FFmpeg `subtitles=` filter. */
export function escapeSubtitlesPath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replaceAll(':', String.raw`\:`).replaceAll("'", String.raw`\'`);
}

/** Safe default for any source layout: keep the full frame. */
export function defaultFitMode(_aspectRatio?: ClipAspectRatio): AspectFitMode {
  return 'fit';
}

/** FFmpeg `subtitles=` filter with fonts + style (libass needs a real font). */
export function buildSubtitlesVf(subtitlePath: string, options?: SubtitlesVfOptions): string {
  const file = escapeSubtitlesPath(subtitlePath);
  const fonts = escapeSubtitlesPath(SUBTITLE_FONTS_DIR);
  const parts = [`subtitles='${file}'`, `fontsdir='${fonts}'`];
  if (
    options?.width !== undefined &&
    options.height !== undefined &&
    options.width > 0 &&
    options.height > 0
  ) {
    // Helps SRT (no PlayRes); ASS already sets PlayResX/Y to the same values.
    parts.push(`original_size=${String(options.width)}x${String(options.height)}`);
  }
  const styleOpts: { width?: number; height?: number } = {};
  if (options?.width !== undefined) {
    styleOpts.width = options.width;
  }
  if (options?.height !== undefined) {
    styleOpts.height = options.height;
  }
  parts.push(`force_style='${subtitleForceStyle(styleOpts)}'`);
  return parts.join(':');
}

function buildFillVf(width: number, height: number, subtitlePath?: string): string {
  const scaleCrop = `scale=${String(width)}:${String(height)}:force_original_aspect_ratio=increase,crop=${String(width)}:${String(height)}`;
  if (!subtitlePath || subtitlePath.trim() === '') {
    return scaleCrop;
  }
  return `${scaleCrop},${buildSubtitlesVf(subtitlePath, { width, height })}`;
}

/**
 * Fit + blurred background: scale source to fit, pad with a blurred/scaled copy of the same frame.
 * Layout-agnostic — preserves the full source regardless of hosts / grid / PiP.
 * Subtitles are applied after overlay so burn-in sits on the composed frame.
 */
function buildFitBlurFilterComplex(width: number, height: number, subtitlePath?: string): string {
  const w = String(width);
  const h = String(height);
  const compose = [
    `[0:v]split=2[bg][fg]`,
    `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=20[blurred]`,
    `[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[scaled]`,
  ];
  if (subtitlePath && subtitlePath.trim() !== '') {
    compose.push(
      `[blurred][scaled]overlay=(W-w)/2:(H-h)/2[composed]`,
      `[composed]${buildSubtitlesVf(subtitlePath, { width, height })}[outv]`,
    );
  } else {
    compose.push(`[blurred][scaled]overlay=(W-w)/2:(H-h)/2[outv]`);
  }
  return compose.join(';');
}

export async function trimVideo(input: TrimVideoInput): Promise<void> {
  assertPaths(input.inputPath, input.outputPath);
  assertTrimRange(input.startMs, input.endMs);

  const startSec = input.startMs / 1000;
  const endSec = input.endMs / 1000;
  await runFfmpeg({
    args: [
      '-y',
      '-ss',
      String(startSec),
      '-to',
      String(endSec),
      '-i',
      input.inputPath,
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

export async function cropVideo(input: CropVideoInput): Promise<void> {
  assertPaths(input.inputPath, input.outputPath);
  if (
    !Number.isFinite(input.width) ||
    !Number.isFinite(input.height) ||
    input.width <= 0 ||
    input.height <= 0
  ) {
    throw new Error('width and height must be positive finite numbers');
  }
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y) || input.x < 0 || input.y < 0) {
    throw new Error('x and y must be non-negative finite numbers');
  }

  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.inputPath,
      '-vf',
      `crop=${String(Math.floor(input.width))}:${String(Math.floor(input.height))}:${String(Math.floor(input.x))}:${String(Math.floor(input.y))}`,
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

export async function resizeVideo(input: ResizeVideoInput): Promise<void> {
  assertPaths(input.inputPath, input.outputPath);
  if (
    !Number.isFinite(input.width) ||
    !Number.isFinite(input.height) ||
    input.width <= 0 ||
    input.height <= 0
  ) {
    throw new Error('width and height must be positive finite numbers');
  }

  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.inputPath,
      '-vf',
      `scale=${String(Math.floor(input.width))}:${String(Math.floor(input.height))}`,
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

export async function encodeVideo(input: EncodeVideoInput): Promise<void> {
  assertPaths(input.inputPath, input.outputPath);
  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.inputPath,
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

/**
 * Trim + aspect fit/fill (+ optional burned subtitles) in one FFmpeg pass.
 * Fit (default): full frame with blurred pad. Fill: center-crop (opt-in).
 */
export async function renderClipVideo(input: RenderClipVideoInput): Promise<void> {
  assertPaths(input.inputPath, input.outputPath);
  assertTrimRange(input.startMs, input.endMs);

  const fitMode = input.fitMode ?? defaultFitMode(input.aspectRatio);
  const { width, height } = TARGET_SIZE[input.aspectRatio];
  const startSec = input.startMs / 1000;
  const endSec = input.endMs / 1000;

  const baseArgs = [
    '-y',
    '-ss',
    String(startSec),
    '-to',
    String(endSec),
    '-i',
    input.inputPath,
  ];

  if (fitMode === 'fill') {
    await runFfmpeg({
      args: [
        ...baseArgs,
        '-vf',
        buildFillVf(width, height, input.vttPath),
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        input.outputPath,
      ],
    });
    return;
  }

  await runFfmpeg({
    args: [
      ...baseArgs,
      '-filter_complex',
      buildFitBlurFilterComplex(width, height, input.vttPath),
      '-map',
      '[outv]',
      '-map',
      '0:a?',
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
