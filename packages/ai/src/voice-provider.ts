export type VoiceAudioFormat = 'wav' | 'mp3' | 'opus' | 'aac' | 'flac' | 'pcm';

export interface Voice {
  id: string;
  name: string;
  description?: string;
  language?: string;
  previewUrl?: string;
}

export interface SynthesizeSpeechInput {
  text: string;
  voiceId?: string;
  format?: VoiceAudioFormat;
}

export interface SynthesizeSpeechResult {
  audio: Buffer;
  contentType: string;
  format: VoiceAudioFormat;
}

export interface VoiceProvider {
  listVoices(): Promise<Voice[]>;
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
}
