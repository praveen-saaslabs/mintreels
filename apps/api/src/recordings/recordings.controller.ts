import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IdentityGuard } from '../guest/identity.guard';
import { GuestRateLimitGuard, RateLimit } from '../guest/guest-rate-limit.guard';
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createRecordingRequestSchema,
  exportRecordingRequestSchema,
  type CreateRecordingRequest,
  type ExportRecordingRequest,
} from './recordings.dto';
import { RecordingsService } from './recordings.service';

@ApiTags('Recordings')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
@Controller('api/recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @ApiOperation({
    summary: 'Create a project and recording from a Filestack URL, then enqueue ingest',
  })
  @ApiCreatedResponse({
    description: 'Project and recording created; ingest job enqueued',
    schema: { example: { id: 10, projectId: 4, jobId: 1 } },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  @ApiForbiddenResponse({ description: 'GUEST_LIMIT_REACHED' })
  @RateLimit('uploads')
  @Post()
  create(
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(createRecordingRequestSchema)) body: CreateRecordingRequest,
  ) {
    return this.recordingsService.create(body, ownership(actor));
  }

  @ApiOperation({ summary: 'List recordings for the current user' })
  @ApiOkResponse({ description: 'Array of recording objects' })
  @Get()
  list(@CurrentActor() actor: RequestActor) {
    return this.recordingsService.list(ownership(actor));
  }

  @ApiOperation({ summary: 'Poll ingest/processing status for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Processing snapshot with full transcript and playback URLs',
    schema: {
      example: {
        recordingId: 10,
        status: 'processing',
        videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
        audioUrl: 'https://cdn.filestackcontent.com/AUDIO',
        thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
        job: {
          id: 1,
          status: 'running',
          currentStep: 'TRANSCRIPTION',
          attempt: 1,
          maxAttempts: 4,
          errorCode: null,
          errorMessage: null,
        },
        steps: [
          { step: 'AUDIO_EXTRACTION', status: 'completed', attempt: 1 },
          { step: 'TRANSCRIPTION', status: 'processing', attempt: 1, provider: 'pyai' },
        ],
        transcript: {
          id: 1,
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
        summary: { id: 1, text: '...' },
        actionItems: [],
        hooks: [],
        audit: [
          {
            jobId: 1,
            event: 'step_started',
            step: 'TRANSCRIPTION',
            message: 'started attempt 1',
            createdAt: '2026-08-13T08:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id/processing')
  getProcessing(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.getProcessing(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Retry a failed or partial ingest job' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({
    description: 'Ingest job re-enqueued; completed steps are kept',
    schema: { example: { id: 10, projectId: 4, jobId: 1 } },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @ApiConflictResponse({ description: 'INGEST_IN_PROGRESS or NOT_RETRYABLE' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/retry')
  retry(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.retry(id, ownership(actor));
  }

  @ApiOperation({
    summary: 'Export the full recording (aspect + optional burned captions)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({
    description: 'Export job queued or existing in-flight/ready export returned',
    schema: {
      example: {
        id: 10,
        projectId: 2,
        title: 'Ep. 14',
        originalFilename: 'ep14.mp4',
        durationMs: 3600000,
        width: 1920,
        height: 1080,
        status: 'ready',
        videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
        audioUrl: 'https://cdn.filestackcontent.com/AUDIO',
        thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
        exportStatus: 'queued',
        exportAspectRatio: '9:16',
        exportFitMode: 'fit',
        exportBurnSubtitles: true,
        exportVideoUrl: null,
        exportThumbnailUrl: null,
        jobId: 42,
        createdAt: '2026-08-13T08:00:00.000Z',
        updatedAt: '2026-08-13T08:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @ApiConflictResponse({ description: 'VIDEO_NOT_AVAILABLE or TRANSCRIPT_REQUIRED' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/export')
  exportRecording(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(exportRecordingRequestSchema)) body: ExportRecordingRequest,
  ) {
    return this.recordingsService.exportRecording(id, ownership(actor), body);
  }

  @ApiOperation({ summary: 'Cancel an in-flight full recording export and restore prior export_*' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Export cancelled; recording export fields restored from pre-job snapshot',
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @ApiConflictResponse({ description: 'EXPORT_NOT_IN_PROGRESS' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/export/cancel')
  cancelExportRecording(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordingsService.cancelExportRecording(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Get a single recording by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Recording object',
    schema: {
      example: {
        id: 10,
        projectId: 2,
        title: 'Ep. 14',
        originalFilename: 'ep14.mp4',
        durationMs: 3600000,
        width: 1920,
        height: 1080,
        status: 'ready',
        videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
        audioUrl: 'https://cdn.filestackcontent.com/AUDIO',
        thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
        exportStatus: null,
        exportAspectRatio: null,
        exportFitMode: null,
        exportBurnSubtitles: null,
        exportVideoUrl: null,
        exportThumbnailUrl: null,
        createdAt: '2026-08-13T08:00:00.000Z',
        updatedAt: '2026-08-13T08:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id')
  getById(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.getById(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Soft-delete a recording and its child rows' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Recording deleted' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.remove(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Add recording to the global knowledge base' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'KB sync job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/add-to-global-kb')
  addToGlobalKnowledgeBase(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordingsService.addToGlobalKnowledgeBase(id, ownership(actor));
  }
}
