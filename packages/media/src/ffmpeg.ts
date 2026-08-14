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

/** Probe media duration in milliseconds via ffprobe. Throws on failure. */
export async function probeDurationMs(filePath: string): Promise<number> {
  if (filePath.trim() === '') {
    throw new Error('filePath is required');
  }
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout?.on('data', (chunk: Buffer | string) => {
      out += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      err += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(out.trim());
        return;
      }
      reject(new Error(err.trim() || `ffprobe exited with code ${String(code)}`));
    });
  });
  const seconds = Number(stdout);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('ffprobe returned an invalid duration');
  }
  return Math.round(seconds * 1000);
}

/** Probe video duration in milliseconds. Returns null on empty path or probe failure. */
export async function probeVideoDurationMs(videoPath: string): Promise<number | null> {
  if (videoPath.trim() === '') {
    return null;
  }

  try {
    const seconds = await new Promise<number>((resolve, reject) => {
      const child = spawn(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          videoPath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      });
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `ffprobe exited with code ${String(code)}`));
          return;
        }
        const parsed = Number.parseFloat(stdout.trim());
        if (!Number.isFinite(parsed) || parsed <= 0) {
          reject(new Error('ffprobe returned an invalid duration'));
          return;
        }
        resolve(parsed);
      });
    });
    return Math.round(seconds * 1000);
  } catch {
    return null;
  }
}
