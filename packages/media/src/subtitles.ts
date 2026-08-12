import type { Transcript } from '@mintreels/domain';

export interface BurnSubtitlesInput {
  videoPath: string;
  vttPath: string;
  outputPath: string;
}

export function transcriptToVtt(_transcript: Transcript): string {
  // TODO: convert timestamped segments to WebVTT. VTT is an export format only.
  throw new Error('transcriptToVtt is not implemented');
}

export async function burnSubtitles(_input: BurnSubtitlesInput): Promise<void> {
  // TODO: video + subtitles → subtitle-burned video via FFmpeg
  throw new Error('burnSubtitles is not implemented');
}
