import { spawn } from 'node:child_process';

export interface FfmpegRunInput {
  args: string[];
}

export async function runFfmpeg(input: FfmpegRunInput): Promise<void> {
  if (input.args.length === 0) {
    throw new Error('ffmpeg args are required');
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', input.args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${String(code)}`));
    });
  });
}
