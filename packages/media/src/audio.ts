export interface ExtractAudioInput {
  videoPath: string;
  outputPath: string;
}

export async function extractAudio(_input: ExtractAudioInput): Promise<void> {
  // TODO: video → audio via FFmpeg
  throw new Error('extractAudio is not implemented');
}
