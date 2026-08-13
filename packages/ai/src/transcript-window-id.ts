import { createHash } from 'node:crypto';

/**
 * Deterministic UUID for a transcript semantic window. Same recording + timestamps always
 * map to the same Qdrant point id so ingest re-runs upsert instead of duplicating.
 */
export function transcriptWindowPointId(recordingId: number, startMs: number, endMs: number): string {
  const hex = createHash('sha1')
    .update(`tw:${String(recordingId)}:${String(startMs)}:${String(endMs)}`)
    .digest('hex');
  const variantNibble = ((Number.parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variantNibble}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
