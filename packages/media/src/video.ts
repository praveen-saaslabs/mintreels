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

export async function trimVideo(_input: TrimVideoInput): Promise<void> {
  // TODO: trim via FFmpeg
  throw new Error('trimVideo is not implemented');
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
