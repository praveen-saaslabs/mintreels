import type { Summary, Transcript } from '@mintreels/domain';
import OpenAI from 'openai';
import { generateExtractiveHooks } from '../../extractive-hooks';
import { mapHookCandidates, type HookCandidate } from '../../hook-candidates';
import type { ActionItem, HookGenerationOptions, LLMProvider } from '../../llm-provider';
import {
  heuristicTranscriptAsk,
  parseTranscriptAskResponse,
  TRANSCRIPT_ASK_JSON_SCHEMA,
  TRANSCRIPT_ASK_SYSTEM,
  type TranscriptAskResult,
} from '../../transcript-ask';
import {
  buildHooksUserPrompt,
  HOOKS_JSON_SCHEMA,
  HOOKS_PROMPT_VERSION,
  HOOKS_SYSTEM_PROMPT,
} from '../../prompts/hooks.prompt';
import { ProviderError } from '../../provider-error';
import { buildSemanticWindows } from '../../semantic-windows';
import type { OpenAICompatibleLLMConfig } from './config';
import { isJsonSchemaUnsupported, mapOpenAICompatibleError } from './errors';
import {
  ACTION_ITEMS_JSON_SCHEMA,
  formatTranscriptText,
  parseActionItemsResponse,
  parseSummaryResponse,
  SUMMARY_JSON_SCHEMA,
} from './parse';

const SUMMARY_SYSTEM = [
  'You summarize meeting and video transcripts. Return JSON only.',
  'Write one paragraph, 150-200 words, no bullets, grounded only in the transcript.',
  'If the transcript is empty or too thin to summarize, return a short honest sentence.',
  'Do not invent facts or pad with fiction.',
].join(' ');

const ACTION_ITEMS_SYSTEM = [
  'Extract concrete action items from the transcript. Return JSON only.',
  'At most 10 items. Use an empty array if there are none.',
  'Each item is a concrete obligation or next step.',
  'Include startMs and endMs in milliseconds when the transcript timestamps make the source span clear; otherwise null.',
  'Do not invent tasks that are not in the transcript.',
].join(' ');

export class OpenAICompatibleLLMProvider implements LLMProvider {
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAICompatibleLLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
  }

  async summarize(transcript: Transcript): Promise<Summary> {
    const payload = formatTranscriptText(transcript);
    return this.completeJson({
      system: SUMMARY_SYSTEM,
      user: payload.length > 0 ? payload : '(empty transcript)',
      schemaName: 'summary',
      jsonSchema: SUMMARY_JSON_SCHEMA,
      parse: (raw) => parseSummaryResponse(raw, transcript.recordingId),
    });
  }

  /** LLM discovery over semantic windows; falls back to the extractive heuristic. */
  async generateHooks(
    transcript: Transcript,
    options: HookGenerationOptions,
  ): Promise<HookCandidate[]> {
    const windows = buildSemanticWindows(transcript.segments);
    if (windows.length > 0) {
      try {
        const candidates = await this.completeJson({
          system: HOOKS_SYSTEM_PROMPT,
          user: buildHooksUserPrompt(windows, options.maxCandidates),
          schemaName: 'hooks',
          jsonSchema: HOOKS_JSON_SCHEMA,
          parse: (raw) =>
            mapHookCandidates(raw, {
              recordingId: transcript.recordingId,
              segments: transcript.segments,
              weights: options.weights,
              maxCandidates: options.maxCandidates,
              provider: this.config.provider,
              model: this.config.model,
              promptVersion: HOOKS_PROMPT_VERSION,
            }),
        });
        if (candidates.length > 0) {
          return candidates;
        }
      } catch (error) {
        console.warn(
          `[${this.config.provider}] hook discovery failed, using extractive hooks: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
    return generateExtractiveHooks(transcript);
  }

  async generateActionItems(transcript: Transcript): Promise<ActionItem[]> {
    const payload = formatTranscriptText(transcript);
    return this.completeJson({
      system: ACTION_ITEMS_SYSTEM,
      user: payload.length > 0 ? payload : '(empty transcript)',
      schemaName: 'action_items',
      jsonSchema: ACTION_ITEMS_JSON_SCHEMA,
      parse: parseActionItemsResponse,
    });
  }

  async askTranscript(transcript: Transcript, question: string): Promise<TranscriptAskResult> {
    const payload = formatTranscriptText(transcript);
    const user = `Transcript:\n${payload.length > 0 ? payload : '(empty transcript)'}\n\nUser:\n${question.trim()}`;
    try {
      return await this.completeJson({
        system: TRANSCRIPT_ASK_SYSTEM,
        user,
        schemaName: 'transcript_ask',
        jsonSchema: TRANSCRIPT_ASK_JSON_SCHEMA,
        parse: (raw) => parseTranscriptAskResponse(raw, question),
      });
    } catch (error) {
      console.warn(
        `[${this.config.provider}] transcript ask failed, using heuristic: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return heuristicTranscriptAsk(transcript, question);
    }
  }

  private async completeJson<T>(input: {
    system: string;
    user: string;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
    parse: (raw: unknown) => T;
  }): Promise<T> {
    let content: string;
    try {
      content = await this.createChat(input.system, input.user, {
        type: 'json_schema',
        json_schema: {
          name: input.schemaName,
          strict: true,
          schema: input.jsonSchema,
        },
      });
    } catch (error) {
      if (!isJsonSchemaUnsupported(error)) {
        throw mapOpenAICompatibleError(error, this.config.provider);
      }
      try {
        content = await this.createChat(input.system, input.user, { type: 'json_object' });
      } catch (fallbackError) {
        throw mapOpenAICompatibleError(fallbackError, this.config.provider);
      }
    }

    let raw: unknown;
    try {
      raw = JSON.parse(content) as unknown;
    } catch {
      throw new ProviderError({
        provider: this.config.provider,
        code: 'invalid_json',
        message: 'LLM returned non-JSON content',
        retryable: false,
      });
    }

    try {
      return input.parse(raw);
    } catch (error) {
      throw new ProviderError({
        provider: this.config.provider,
        code: 'invalid_response',
        message: error instanceof Error ? error.message : 'LLM response failed validation',
        retryable: false,
      });
    }
  }

  private async createChat(
    system: string,
    user: string,
    responseFormat:
      | { type: 'json_object' }
      | {
          type: 'json_schema';
          json_schema: { name: string; strict: true; schema: Record<string, unknown> };
        },
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: responseFormat,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new ProviderError({
        provider: this.config.provider,
        code: 'empty_response',
        message: 'LLM returned an empty completion',
        retryable: true,
      });
    }
    return content;
  }
}
