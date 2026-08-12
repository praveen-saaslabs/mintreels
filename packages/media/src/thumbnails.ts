export interface GenerateThumbnailInput {
  videoPath: string;
  outputPath: string;
  atMs?: number;
}

export async function generateThumbnail(_input: GenerateThumbnailInput): Promise<void> {
  // TODO: generate clip/recording thumbnails via FFmpeg
  throw new Error('generateThumbnail is not implemented');
}
