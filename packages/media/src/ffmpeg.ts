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
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderr
        .trim()
        .split('\n')
        .filter((line) => line.trim() !== '')
        .slice(-12)
        .join('\n');
      reject(
        new Error(
          detail
            ? `ffmpeg exited with code ${String(code)}:\n${detail}`
            : `ffmpeg exited with code ${String(code)}`,
        ),
      );
    });
  });
}
