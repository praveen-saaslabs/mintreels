import type { Hook, Summary, Transcript } from '@mintreels/domain';

export interface LLMProvider {
  summarize(transcript: Transcript): Promise<Summary>;
  generateHooks(transcript: Transcript): Promise<Hook[]>;
}
