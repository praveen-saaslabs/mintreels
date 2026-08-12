export interface FfmpegRunInput {
  args: string[];
}

export async function runFfmpeg(_input: FfmpegRunInput): Promise<void> {
  // TODO: invoke ffmpeg. Do not implement command construction here until media jobs are built.
  throw new Error('runFfmpeg is not implemented');
}
