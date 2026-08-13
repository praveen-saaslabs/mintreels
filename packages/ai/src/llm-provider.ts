import type { Hook, Summary, Transcript } from '@mintreels/domain';

export interface ActionItem {
  text: string;
  startMs?: number;
  endMs?: number;
}

export interface LLMProvider {
  summarize(transcript: Transcript): Promise<Summary>;
  generateHooks(transcript: Transcript): Promise<Hook[]>;
  generateActionItems(transcript: Transcript): Promise<ActionItem[]>;
}
