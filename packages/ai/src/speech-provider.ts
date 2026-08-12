import type { Transcript, TranscriptionInput } from '@mintreels/domain';

export interface SpeechProvider {
  transcribe(input: TranscriptionInput): Promise<Transcript>;
}
