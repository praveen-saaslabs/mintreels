import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { extractAudio } from '@mintreels/media';
import { isAudioFilename } from '@mintreels/storage';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

async function writeStreamToFile(stream: ReadableStream, filePath: string): Promise<void> {
  await pipeline(
    Readable.fromWeb(stream as unknown as WebReadableStream),
    createWriteStream(filePath),
  );
}

export function audioExtractionHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const recording = await deps.recordings.findOneByOrFail({ id: ctx.recordingId });
    if (recording.audioStorageKey) {
      return { key: recording.audioStorageKey, skipped: true };
    }
    if (isAudioFilename(recording.originalFilename)) {
      recording.audioStorageKey = recording.storageKey;
      await deps.recordings.save(recording);
      return { key: recording.audioStorageKey, skipped: true };
    }

    const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-'));
    const videoPath = join(tmpDir, 'video.bin');
    const audioPath = join(tmpDir, 'audio.wav');
    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    await extractAudio({ videoPath, outputPath: audioPath });
    return { audioPath, tmpDir };
  };
}
