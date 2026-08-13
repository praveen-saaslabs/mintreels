import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { extractAudio } from '@mintreels/media';
import { JobStepName } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import type { StepHandler } from '../step-runner';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeStreamToFile(stream: ReadableStream, filePath: string): Promise<void> {
  await pipeline(
    Readable.fromWeb(stream as unknown as WebReadableStream),
    createWriteStream(filePath),
  );
}

export function audioUploadHandler(deps: WorkerDeps): StepHandler {
  return async (ctx) => {
    const recording = await deps.recordings.findOneByOrFail({ id: ctx.recordingId });
    if (recording.audioStorageKey) {
      return { key: recording.audioStorageKey, skipped: true };
    }

    const extraction = await deps.jobSteps.findByJobIdAndStep(ctx.jobId, JobStepName.AudioExtraction);
    let audioPath = typeof extraction?.result?.audioPath === 'string' ? extraction.result.audioPath : '';
    let tmpDir = typeof extraction?.result?.tmpDir === 'string' ? extraction.result.tmpDir : '';

    // ponytail: temp paths die on crash; re-extract from video if the wav is gone.
    if (audioPath === '' || !(await fileExists(audioPath))) {
      tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-'));
      const videoPath = join(tmpDir, 'video.bin');
      audioPath = join(tmpDir, 'audio.wav');
      const stream = await deps.storage.download(recording.storageKey);
      await writeStreamToFile(stream, videoPath);
      await extractAudio({ videoPath, outputPath: audioPath });
    }

    const body = await readFile(audioPath);
    const stored = await deps.storage.upload({
      key: `recording-${String(recording.id)}.wav`,
      body,
      contentType: 'audio/wav',
    });
    recording.audioStorageKey = stored.key;
    await deps.recordings.save(recording);
    if (tmpDir !== '') {
      await rm(tmpDir, { recursive: true, force: true });
    }
    return { key: stored.key };
  };
}
