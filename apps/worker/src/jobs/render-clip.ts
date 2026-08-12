import type { JobStatus } from '@mintreels/domain';

export interface RenderClipPayload {
  clipId: string;
  recordingId: string;
  startMs: number;
  endMs: number;
  burnSubtitles: boolean;
}

export async function renderClip(_payload: RenderClipPayload): Promise<JobStatus> {
  // TODO: FFmpeg trim/crop/subtitles/encode → upload exported MP4
  throw new Error('renderClip is not implemented');
}
