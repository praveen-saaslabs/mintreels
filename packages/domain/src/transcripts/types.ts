export interface TranscriptSegment {
  id: number;
  sequence: number;
  startMs: number;
  endMs: number;
  speaker?: string;
  text: string;
}

export interface Transcript {
  id: number;
  recordingId: number;
  language?: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionInput {
  recordingId: number;
  storageKey: string;
  language?: string;
}
