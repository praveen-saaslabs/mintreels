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

export async function trimVideo(input: TrimVideoInput): Promise<void> {
  if (input.inputPath.trim() === '' || input.outputPath.trim() === '') {
    throw new Error('inputPath and outputPath are required');
  }
  if (
    !Number.isFinite(input.startMs) ||
    !Number.isFinite(input.endMs) ||
    input.startMs < 0 ||
    input.endMs <= input.startMs
  ) {
    throw new Error('startMs and endMs must be finite with endMs greater than startMs');
  }

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

export async function cropVideo(_input: CropVideoInput): Promise<void> {
  // TODO: crop via FFmpeg
  throw new Error('cropVideo is not implemented');
}

export async function resizeVideo(_input: ResizeVideoInput): Promise<void> {
  // TODO: resize via FFmpeg
  throw new Error('resizeVideo is not implemented');
}

export async function encodeVideo(_input: EncodeVideoInput): Promise<void> {
  // TODO: encode via FFmpeg
  throw new Error('encodeVideo is not implemented');
}
