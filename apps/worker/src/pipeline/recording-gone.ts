import type { Recording } from '@mintreels/db';
import type { WorkerDeps } from './deps';

/** Recording missing or soft-deleted — ingest should no-op like render-clip. */
export class RecordingGoneError extends Error {
  constructor(recordingId: number) {
    super(`Recording ${String(recordingId)} is gone`);
    this.name = 'RecordingGoneError';
  }
}

export async function requireActiveRecording(
  recordings: WorkerDeps['recordings'],
  recordingId: number,
): Promise<Recording> {
  const recording = await recordings.findOneBy({ id: recordingId });
  if (!recording) {
    throw new RecordingGoneError(recordingId);
  }
  return recording;
}
