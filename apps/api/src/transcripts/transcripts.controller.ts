import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  applyOverdubRequestSchema,
  patchTranscriptSegmentRequestSchema,
  type ApplyOverdubRequest,
  type PatchTranscriptSegmentRequest,
} from './transcripts.dto';
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

  @ApiOperation({ summary: 'Update transcript segment text (public segment id = sequence)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'segmentId', type: Number, description: 'Segment sequence (public id)' })
  @ApiBody({
    schema: { example: { text: 'The roadmap was never a plan.' } },
  })
  @ApiOkResponse({
    description: 'Updated public segment',
    schema: {
      example: {
        id: 0,
        start: 0,
        end: 1.5,
        text: 'The roadmap was never a plan.',
        speaker: 'speaker_1',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid text' })
  @ApiNotFoundResponse({ description: 'Recording or segment not found' })
  @Patch(':id/transcript/segments/:segmentId')
  patchSegment(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
    @Body(new ZodValidationPipe(patchTranscriptSegmentRequestSchema))
    body: PatchTranscriptSegmentRequest,
  ) {
    return this.transcriptsService.patchSegment(id, segmentId, body, ownership(actor));
  }

  @ApiOperation({ summary: 'Synthesize segment text and replace audio in the source recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'segmentId', type: Number, description: 'Segment sequence (public id)' })
  @ApiBody({
    schema: { example: { voiceId: 'stock_dorit_en_us' } },
  })
  @ApiAcceptedResponse({
    description: 'Overdub job enqueued',
    schema: {
      example: {
        jobId: 12,
        status: 'queued',
        segmentId: 0,
        voiceId: 'stock_dorit_en_us',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'INVALID_SEGMENT_RANGE | EMPTY_SEGMENT_TEXT' })
  @ApiConflictResponse({ description: 'VIDEO_NOT_AVAILABLE | OVERDUB_IN_PROGRESS' })
  @ApiNotFoundResponse({ description: 'Recording or segment not found' })
  @HttpCode(202)
  @Post(':id/transcript/segments/:segmentId/overdub')
  applyOverdub(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
    @Body(new ZodValidationPipe(applyOverdubRequestSchema)) body: ApplyOverdubRequest,
  ) {
    return this.transcriptsService.applyOverdub(id, segmentId, body, ownership(actor));
  }

  @ApiOperation({ summary: 'Get the latest apply-overdub job status for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Latest overdub job snapshot',
    schema: {
      example: { jobId: 12, status: 'running', error: null, segmentId: 0 },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id/transcript/overdub')
  getOverdubJob(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getOverdubJob(id, ownership(actor));
  }
}
