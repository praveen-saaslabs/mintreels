import { spawn } from 'node:child_process';
import { runFfmpeg } from './ffmpeg';

export interface ProbeDurationInput {
  inputPath: string;
}

/** Returns media duration in seconds via ffprobe. */
export async function probeDurationSeconds(input: ProbeDurationInput): Promise<number> {
  if (input.inputPath.trim() === '') {
    throw new Error('inputPath is required');
  }
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
        input.inputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${String(code)}`));
        return;
      }
      const value = Number(stdout.trim());
      if (!Number.isFinite(value) || value <= 0) {
        reject(new Error('ffprobe returned an invalid duration'));
        return;
      }
      resolve(value);
    });
  });
  return seconds;
}

/** Build atempo chain (each factor must be in [0.5, 2.0]). */
export function buildAtempoFilter(speed: number): string {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error('speed must be a positive finite number');
  }
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(',');
}

export interface MixVoiceoverOntoVideoInput {
  videoPath: string;
  voiceoverPath: string;
  outputPath: string;
  placement: 'pre' | 'duck';
}

/**
 * Mix TTS voiceover onto a trimmed clip.
 * - duck: lower original audio under the VO; video timing unchanged
 * - pre: freeze the first frame for the VO duration, delay original audio by the
 *   same amount, then play the clip in sync (VO first, then original A/V together)
 */
export async function mixVoiceoverOntoVideo(input: MixVoiceoverOntoVideoInput): Promise<void> {
  if (
    input.videoPath.trim() === '' ||
    input.voiceoverPath.trim() === '' ||
    input.outputPath.trim() === ''
  ) {
    throw new Error('videoPath, voiceoverPath, and outputPath are required');
  }

  const voSeconds = await probeDurationSeconds({ inputPath: input.voiceoverPath });
  const delayMs = Math.max(0, Math.round(voSeconds * 1000));
  const padSec = (delayMs / 1000).toFixed(3);

  if (input.placement === 'pre') {
    // Pad video start so it stays locked to the delayed original audio.
    const filterComplex = [
      `[0:v]tpad=start_mode=clone:start_duration=${padSec},setpts=PTS-STARTPTS[vout]`,
      `[0:a]adelay=${String(delayMs)}|${String(delayMs)},aformat=sample_fmts=fltp:channel_layouts=stereo[main]`,
      `[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo[vo]`,
      `[main][vo]amix=inputs=2:duration=longest:dropout_transition=0[aout]`,
    ].join(';');

    await runFfmpeg({
      args: [
        '-y',
        '-i',
        input.videoPath,
        '-i',
        input.voiceoverPath,
        '-filter_complex',
        filterComplex,
        '-map',
        '[vout]',
        '-map',
        '[aout]',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        input.outputPath,
      ],
    });
    return;
  }

  const filterComplex =
    `[0:a]volume=0.25[main];[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo[vo];` +
    `[main][vo]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.videoPath,
      '-i',
      input.voiceoverPath,
      '-filter_complex',
      filterComplex,
      '-map',
      '0:v',
      '-map',
      '[aout]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-shortest',
      input.outputPath,
    ],
  });
}

export interface ReplaceAudioRangeInput {
  videoPath: string;
  replacementAudioPath: string;
  outputPath: string;
  startMs: number;
  endMs: number;
}

/**
 * Replace the video's audio between startMs and endMs with TTS audio fitted to that window.
 * Video timing is unchanged (no ripple edit).
 */
export async function replaceAudioRange(input: ReplaceAudioRangeInput): Promise<void> {
  if (
    input.videoPath.trim() === '' ||
    input.replacementAudioPath.trim() === '' ||
    input.outputPath.trim() === ''
  ) {
    throw new Error('videoPath, replacementAudioPath, and outputPath are required');
  }
  if (
    !Number.isFinite(input.startMs) ||
    !Number.isFinite(input.endMs) ||
    input.startMs < 0 ||
    input.endMs <= input.startMs
  ) {
    throw new Error('startMs and endMs must be finite with endMs greater than startMs');
  }

  const startSec = input.startMs / 1000;
  const endSec = input.endMs / 1000;
  const windowSec = endSec - startSec;
  const voSec = await probeDurationSeconds({ inputPath: input.replacementAudioPath });
  const speed = voSec / windowSec;
  const atempo = buildAtempoFilter(speed);

  const filterComplex = [
    `[0:a]atrim=0:${startSec.toFixed(3)},asetpts=PTS-STARTPTS[a_before]`,
    `[1:a]${atempo},atrim=0:${windowSec.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:channel_layouts=stereo[vo]`,
    `[0:a]atrim=${endSec.toFixed(3)},asetpts=PTS-STARTPTS[a_after]`,
    `[a_before][vo][a_after]concat=n=3:v=0:a=1[aout]`,
  ].join(';');

  await runFfmpeg({
    args: [
      '-y',
      '-i',
      input.videoPath,
      '-i',
      input.replacementAudioPath,
      '-filter_complex',
      filterComplex,
      '-map',
      '0:v',
      '-map',
      '[aout]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      input.outputPath,
    ],
  });
}
