import { Controller, Get, Header, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IdentityGuard } from '../guest/identity.guard';
import { GuestRateLimitGuard } from '../guest/guest-rate-limit.guard';
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import { TranscriptsService } from './transcripts.service';

@ApiTags('Transcripts')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
@Controller('api/recordings')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @ApiOperation({ summary: 'Get the JSON transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Public transcript DTO (seconds, no rawResponse)',
    schema: {
      example: {
        id: 1,
        recordingId: 10,
        language: 'en',
        text: '[speaker_1] Hello world',
        words: [{ word: 'Hello', start: 0, end: 0.4, speaker: 'speaker_1' }],
        formats: {
          srt: 'https://example.com/job.srt',
          vtt: 'https://example.com/job.vtt',
        },
        segments: [{ id: 0, start: 0, end: 1.5, text: 'Hello world', speaker: 'speaker_1' }],
        speakers: 1,
        audio_seconds: 1.5,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Get(':id/transcript')
  getByRecordingId(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getByRecordingId(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Get the WebVTT transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiProduces('text/vtt')
  @ApiOkResponse({ description: 'Transcript in WebVTT format', content: { 'text/vtt': {} } })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Header('Content-Type', 'text/vtt; charset=utf-8')
  @Get(':id/transcript.vtt')
  getVttByRecordingId(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getVttByRecordingId(id, ownership(actor));
  }
}
