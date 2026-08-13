import { ProviderError } from '../../provider-error';
import type {
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  Voice,
  VoiceAudioFormat,
  VoiceProvider,
} from '../../voice-provider';
import type { PyAIClient } from './client';
import { mapPyAIError } from './errors';

const SPEAK_MODEL = 'pyai-voice';
const DEFAULT_FORMAT: VoiceAudioFormat = 'mp3';

const CONTENT_TYPE_BY_FORMAT: Record<VoiceAudioFormat, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  opus: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  pcm: 'audio/pcm',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
}

function mapVoice(raw: unknown): Voice | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const id = stringField(record, 'id', 'voice_id', 'voiceId');
  if (!id) {
    return null;
  }
  const name = stringField(record, 'name', 'display_name', 'label') ?? id;
  const voice: Voice = { id, name };
  const description = stringField(record, 'description', 'persona', 'bio');
  if (description !== undefined) {
    voice.description = description;
  }
  const language = stringField(record, 'language', 'locale', 'lang');
  if (language !== undefined) {
    voice.language = language;
  }
  const previewUrl = stringField(record, 'preview_url', 'previewUrl', 'avatar_url', 'sample_url');
  if (previewUrl !== undefined) {
    voice.previewUrl = previewUrl;
  }
  return voice;
}

function extractVoiceList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (!record) {
    return [];
  }
  for (const key of ['data', 'voices', 'items', 'results']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

export class PyAIVoiceProvider implements VoiceProvider {
  constructor(private readonly client: PyAIClient) {}

  async listVoices(): Promise<Voice[]> {
    try {
      const payload = await this.client.listVoices();
      const voices: Voice[] = [];
      for (const item of extractVoiceList(payload)) {
        const mapped = mapVoice(item);
        if (mapped) {
          voices.push(mapped);
        }
      }
      return voices;
    } catch (error) {
      throw mapPyAIError(error);
    }
  }

  async synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    const text = input.text.trim();
    if (text === '') {
      throw new ProviderError({
        provider: 'pyai',
        code: 'invalid_request_error',
        message: 'Speech input text is required',
        retryable: false,
      });
    }
    const format = input.format ?? DEFAULT_FORMAT;
    try {
      const result = await this.client.synthesizeSpeech({
        input: text,
        model: SPEAK_MODEL,
        responseFormat: format,
        stream: false,
        ...(input.voiceId !== undefined && input.voiceId.trim() !== ''
          ? { voice: input.voiceId.trim() }
          : {}),
      });
      return {
        audio: result.audio,
        contentType: result.contentType || CONTENT_TYPE_BY_FORMAT[format],
        format,
      };
    } catch (error) {
      throw mapPyAIError(error);
    }
  }
}
