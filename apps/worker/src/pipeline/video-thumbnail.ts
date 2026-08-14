import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateThumbnail, probeVideoDurationMs } from '@mintreels/media';
import type { StorageProvider } from '@mintreels/storage';
import type { WorkerDeps } from './deps';
import { requireActiveRecording } from './recording-gone';

const EDGE_MS = 1000;

export function midpointThumbnailAtMs(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }
  if (durationMs <= EDGE_MS * 2) {
    return Math.max(0, Math.floor(durationMs / 2));
  }
  const mid = durationMs / 2;
  return Math.min(durationMs - EDGE_MS, Math.max(EDGE_MS, mid));
}

async function resolveThumbnailAtMs(input: {
  atMs?: number;
  durationMs?: number | null;
  localVideoPath: string | null;
}): Promise<number | null> {
  if (input.atMs !== undefined && Number.isFinite(input.atMs) && input.atMs >= 0) {
    if (input.durationMs != null && input.durationMs > 0) {
      return Math.min(input.durationMs, Math.max(0, input.atMs));
    }
    return input.atMs;
  }
  if (input.durationMs != null && Number.isFinite(input.durationMs) && input.durationMs > 0) {
    return midpointThumbnailAtMs(input.durationMs);
  }
  if (input.localVideoPath) {
    const probed = await probeVideoDurationMs(input.localVideoPath);
    if (probed != null && probed > 0) {
      return midpointThumbnailAtMs(probed);
    }
  }
  return null;
}

export async function storeVideoThumbnail(input: {
  storage: StorageProvider;
  videoStorageKey: string;
  localVideoPath: string | null;
  tmpDir: string | null;
  uploadKey: string;
  atMs?: number;
  durationMs?: number | null;
}): Promise<string | null> {
  const atMs = await resolveThumbnailAtMs({
    localVideoPath: input.localVideoPath,
    ...(input.atMs !== undefined ? { atMs: input.atMs } : {}),
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
  });
  if (atMs === null) {
    return null;
  }

  try {
    const fromProvider = await input.storage.createVideoThumbnail(input.videoStorageKey, { atMs });
    return fromProvider.key;
  } catch {
    // Filestack video convert may be unavailable; fall back to a local frame upload.
  }
  if (input.localVideoPath === null || input.tmpDir === null) {
    return null;
  }
  try {
    const thumbPath = join(input.tmpDir, input.uploadKey);
    await generateThumbnail({ videoPath: input.localVideoPath, outputPath: thumbPath, atMs });
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
      durationMs: recording.durationMs,
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
