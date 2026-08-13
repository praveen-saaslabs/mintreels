import { runFfmpeg } from './ffmpeg';

export interface ExtractAudioInput {
  videoPath: string;
  outputPath: string;
}

export async function extractAudio(input: ExtractAudioInput): Promise<void> {
  if (input.videoPath.trim() === '' || input.outputPath.trim() === '') {
    throw new Error('videoPath and outputPath are required');
  }
  await runFfmpeg({
    args: ['-y', '-i', input.videoPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', input.outputPath],
  });
}
