import type { Summary, Transcript } from '@mintreels/domain';
import { generateExtractiveHooks } from '../../extractive-hooks';
import type { HookCandidate } from '../../hook-candidates';
import type { ActionItem, HookGenerationOptions, LLMProvider } from '../../llm-provider';
import type { EmbeddingProvider } from '../../embedding-provider';
import type { PyAIClient } from './client';

const SUBSTANTIAL_MIN_CHARS = 40;
const OBLIGATION =
  /\b(need to|have to|must|should|let'?s|please|follow up|action item|i'?ll|we will|todo|to-do)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function substantialSentences(transcript: Transcript): string[] {
  return transcript.segments
    .flatMap((segment) => splitSentences(segment.text))
    .filter((sentence) => sentence.length >= SUBSTANTIAL_MIN_CHARS || /[.?!]/.test(sentence));
}

/**
 * Extractive fallback. Production summarize/action-items use OpenAICompatibleLLMProvider.
 * Hooks still share generateExtractiveHooks with that adapter.
 */
export class PyAILLMProvider implements LLMProvider, EmbeddingProvider {
  readonly provider = 'pyai';
  readonly model = 'unimplemented';
  readonly dimensions = 0;

  constructor(private readonly client: PyAIClient) {
    void this.client;
  }

  async summarize(transcript: Transcript): Promise<Summary> {
    const sentences = substantialSentences(transcript);
    const picked: string[] = [];
    if (sentences[0]) picked.push(sentences[0]);
    const mid = sentences[Math.floor(sentences.length / 2)];
    if (mid && mid !== picked[0]) picked.push(mid);
    const last = sentences.at(-1);
    if (last && last !== picked[0] && last !== picked.at(-1)) picked.push(last);
    const text =
      picked.join(' ') ||
      transcript.segments
        .map((segment) => segment.text.trim())
        .filter((part) => part.length > 0)
        .slice(0, 3)
        .join(' ') ||
      'No substantial speech was found in the transcript.';
    return {
      id: 0,
      recordingId: transcript.recordingId,
      text,
      createdAt: new Date(),
    };
  }

  async generateHooks(
    transcript: Transcript,
    _options: HookGenerationOptions,
  ): Promise<HookCandidate[]> {
    return generateExtractiveHooks(transcript);
  }

  async generateActionItems(transcript: Transcript): Promise<ActionItem[]> {
    const items: ActionItem[] = [];
    for (const segment of transcript.segments) {
      for (const sentence of splitSentences(segment.text)) {
        if (!OBLIGATION.test(sentence)) continue;
        const item: ActionItem = { text: sentence, startMs: segment.startMs, endMs: segment.endMs };
        items.push(item);
      }
    }
    return items;
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error('PyAILLMProvider.embed is not implemented');
  }
}
