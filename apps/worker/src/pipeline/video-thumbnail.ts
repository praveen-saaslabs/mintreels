import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateThumbnail } from '@mintreels/media';
import type { StorageProvider } from '@mintreels/storage';
import type { WorkerDeps } from './deps';
import { requireActiveRecording } from './recording-gone';

export async function storeVideoThumbnail(input: {
  storage: StorageProvider;
  videoStorageKey: string;
  localVideoPath: string | null;
  tmpDir: string | null;
  uploadKey: string;
}): Promise<string | null> {
  try {
    const fromProvider = await input.storage.createVideoThumbnail(input.videoStorageKey);
    return fromProvider.key;
  } catch {
    // Filestack video convert may be unavailable; fall back to a local frame upload.
  }
  if (input.localVideoPath === null || input.tmpDir === null) {
    return null;
  }
  try {
    const thumbPath = join(input.tmpDir, input.uploadKey);
    await generateThumbnail({ videoPath: input.localVideoPath, outputPath: thumbPath, atMs: 0 });
    const body = await readFile(thumbPath);
    const stored = await input.storage.upload({
      key: input.uploadKey,
      body,
      contentType: 'image/jpeg',
    });
    return stored.key;
  } catch {
    return null;
  }
}

/** Best-effort recording poster. Never throws; never fails ingest. */
export async function ensureRecordingThumbnail(input: {
  deps: WorkerDeps;
  recordingId: number;
  localVideoPath?: string | null;
  tmpDir?: string | null;
}): Promise<void> {
  try {
    const recording = await requireActiveRecording(input.deps.recordings, input.recordingId);
    if (recording.thumbnailStorageKey) {
      return;
    }
    if (recording.storageKey.trim() === '') {
      return;
    }
    const thumbKey = await storeVideoThumbnail({
      storage: input.deps.storage,
      videoStorageKey: recording.storageKey,
      localVideoPath: input.localVideoPath ?? null,
      tmpDir: input.tmpDir ?? null,
      uploadKey: `recording-${String(recording.id)}-thumb.jpg`,
    });
    if (!thumbKey) {
      return;
    }
    recording.thumbnailStorageKey = thumbKey;
    await input.deps.recordings.save(recording);
  } catch {
    // Missing/soft-deleted recording or provider failure — never fail ingest.
  }
}
