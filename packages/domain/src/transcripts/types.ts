export interface TranscriptSegment {
  id: string;
  sequence: number;
  startMs: number;
  endMs: number;
  speaker?: string;
  text: string;
}

export interface Transcript {
  id: string;
  recordingId: string;
  language?: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionInput {
  recordingId: string;
  storageKey: string;
  language?: string;
}
