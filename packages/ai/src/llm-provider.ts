import type { Summary, Transcript } from '@mintreels/domain';
import type { HookCandidate, HookScoreWeights } from './hook-candidates';
import type { TranscriptAskResult } from './transcript-ask';
import type { SocialCopyContext } from './prompts/social-copy.prompt';

export interface ActionItem {
  text: string;
  startMs?: number;
  endMs?: number;
}

export interface HookGenerationOptions {
  weights: HookScoreWeights;
  maxCandidates: number;
}

export interface SocialCopyResult {
  title: string;
  description: string;
}

export interface LLMProvider {
  summarize(transcript: Transcript): Promise<Summary>;
  generateHooks(transcript: Transcript, options: HookGenerationOptions): Promise<HookCandidate[]>;
  generateActionItems(transcript: Transcript): Promise<ActionItem[]>;
  askTranscript(transcript: Transcript, question: string): Promise<TranscriptAskResult>;
  generateSocialCopy(context: SocialCopyContext): Promise<SocialCopyResult>;
}
