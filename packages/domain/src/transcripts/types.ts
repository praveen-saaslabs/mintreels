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
  audioUrl?: string;
  idempotencyKey?: string;
}

export type TranscriptionJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TranscriptionAudioFile {
  body: Uint8Array;
  filename: string;
}

export interface TranscriptionSubmitInput {
  audioUrl?: string;
  audio?: TranscriptionAudioFile;
  idempotencyKey?: string;
  language?: string;
  recordingId?: number;
  storageKey?: string;
}

export interface TranscriptionSubmission {
  providerJobId: string;
  status: TranscriptionJobStatus;
  error?: string;
}

export interface CanonicalTranscriptSegment {
  sequence: number;
  startMs: number;
  endMs: number;
  speaker?: string;
  text: string;
}

export interface CanonicalTranscriptWord {
  word: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

export interface CanonicalTranscriptFormats {
  srt?: string;
  vtt?: string;
}

export interface CanonicalTranscript {
  text: string;
  language?: string;
  durationMs?: number;
  speakerCount?: number;
  words?: CanonicalTranscriptWord[];
  formats?: CanonicalTranscriptFormats;
  segments: CanonicalTranscriptSegment[];
}
