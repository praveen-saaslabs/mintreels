import type { Transcript, TranscriptionInput } from '@mintreels/domain';
import type { SpeechProvider } from '../../speech-provider';
import type { PyAIClient } from './client';

export class PyAISpeechProvider implements SpeechProvider {
  constructor(private readonly client: PyAIClient) {}

  async transcribe(_input: TranscriptionInput): Promise<Transcript> {
    void this.client;
    // TODO: call PyAI speech API and map the response to Transcript
    throw new Error('PyAISpeechProvider.transcribe is not implemented');
  }
}
