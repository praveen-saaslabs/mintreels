import { runFfmpeg } from './ffmpeg';

export interface GenerateThumbnailInput {
  videoPath: string;
  outputPath: string;
  atMs?: number;
}

export async function generateThumbnail(input: GenerateThumbnailInput): Promise<void> {
  if (input.videoPath.trim() === '' || input.outputPath.trim() === '') {
    throw new Error('videoPath and outputPath are required');
  }
  const atMs = input.atMs ?? 0;
  if (!Number.isFinite(atMs) || atMs < 0) {
    throw new Error('atMs must be a non-negative finite number');
  }
  await runFfmpeg({
    args: [
      '-y',
      '-ss',
      String(atMs / 1000),
      '-i',
      input.videoPath,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      input.outputPath,
    ],
  });
}
