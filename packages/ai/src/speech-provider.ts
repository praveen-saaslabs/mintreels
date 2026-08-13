import type {
  CanonicalTranscript,
  Transcript,
  TranscriptionInput,
  TranscriptionSubmission,
  TranscriptionSubmitInput,
} from '@mintreels/domain';

export interface SpeechProvider {
  submitTranscription(input: TranscriptionSubmitInput): Promise<TranscriptionSubmission>;
  getTranscriptionStatus(providerJobId: string): Promise<TranscriptionSubmission>;
  getTranscriptionResult(providerJobId: string): Promise<CanonicalTranscript>;
  transcribe(input: TranscriptionInput): Promise<Transcript>;
}
