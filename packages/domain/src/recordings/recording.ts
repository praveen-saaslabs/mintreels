import type { Recording, RecordingStatus } from './types';

const TERMINAL_STATUSES: ReadonlySet<RecordingStatus> = new Set(['ready', 'failed']);

export function isRecordingReady(recording: Recording): boolean {
  return recording.status === 'ready';
}

export function isTerminalStatus(status: RecordingStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
