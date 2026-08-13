import { Inject, Injectable } from '@nestjs/common';
import type { Voice, VoiceProvider } from '@mintreels/ai';
import { VOICE_PROVIDER } from '../providers/provider-tokens';

@Injectable()
export class VoicesService {
  constructor(@Inject(VOICE_PROVIDER) private readonly voices: VoiceProvider) {}

  list(): Promise<Voice[]> {
    return this.voices.listVoices();
  }
}
