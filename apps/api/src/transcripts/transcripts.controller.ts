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
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { TranscriptsService } from './transcripts.service';

@ApiTags('Transcripts')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @ApiOperation({ summary: 'Get the JSON transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Transcript with timestamped segments',
    schema: {
      example: {
        id: 1,
        recordingId: 10,
        language: 'en',
        createdAt: '2026-08-13T08:00:00.000Z',
        segments: [
          { id: 1, sequence: 0, startMs: 0, endMs: 1200, speaker: 'A', text: 'Hello' },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Get(':id/transcript')
  getByRecordingId(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getByRecordingId(id, user.id);
  }

  @ApiOperation({ summary: 'Get the WebVTT transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiProduces('text/vtt')
  @ApiOkResponse({ description: 'Transcript in WebVTT format', content: { 'text/vtt': {} } })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Header('Content-Type', 'text/vtt; charset=utf-8')
  @Get(':id/transcript.vtt')
  getVttByRecordingId(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getVttByRecordingId(id, user.id);
  }
}
