import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
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
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClipFitMode, ClipRatio, ClipStatus } from '@mintreels/schema';
import { IdentityGuard } from '../guest/identity.guard';
import { GuestRateLimitGuard, RateLimit } from '../guest/guest-rate-limit.guard';
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import {
  exportHookClipRequestSchema,
  type ExportHookClipRequest,
} from '../clips/clips.dto';
import { ClipsService } from '../clips/clips.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { HooksService } from './hooks.service';

@ApiTags('Hooks')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
@Controller('api/recordings')
export class HooksController {
  constructor(
    private readonly hooksService: HooksService,
    private readonly clipsService: ClipsService,
  ) {}

  @ApiOperation({ summary: 'List all hooks for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Array of hook objects',
    schema: {
      example: [
        {
          id: 1,
          recordingId: 10,
          title: 'The roadmap was never a plan',
          hook: 'The roadmap was never a plan',
          reason: 'Strong contrast in the first line',
          startMs: 252000,
          endMs: 293000,
          score: 0.91,
          createdAt: '2026-08-13T08:00:00.000Z',
          clip: {
            id: 3,
            status: ClipStatus.Ready,
            videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
            thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id/hooks')
  listByRecordingId(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.hooksService.listByRecordingId(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Trigger AI hook generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Hook generation job enqueued' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @RateLimit('ai-generations')
  @Post(':id/hooks/generate')
  generate(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.hooksService.generate(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Export a clip from a hook time range' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'hookId', type: Number })
  @ApiBody({
    required: false,
    schema: {
      example: {
        aspectRatio: ClipRatio.Vertical,
        fitMode: ClipFitMode.Fit,
        burnSubtitles: true,
        voiceover: {
          enabled: true,
          voiceId: 'stock_dorit_en_us',
          titleText: 'The roadmap was never a plan',
          ctaText: 'Follow for more product stories',
          placement: 'duck',
        },
      },
    },
  })
  @ApiAcceptedResponse({
    description: 'Clip row created or reused; render job enqueued when needed',
    schema: {
      example: {
        id: 3,
        title: 'The roadmap was never a plan',
        recordingId: 10,
        hookId: 1,
        projectId: 2,
        projectName: 'Q3 Product Podcast',
        recordingTitle: 'Ep. 14',
        startMs: 252000,
        endMs: 293000,
        status: ClipStatus.Queued,
        aspectRatio: ClipRatio.Vertical,
        fitMode: ClipFitMode.Fit,
        burnSubtitles: true,
        subtitleStyle: null,
        voiceover: null,
        videoUrl: null,
        thumbnailUrl: null,
        ratio: ClipRatio.Vertical,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'INVALID_HOOK_RANGE' })
  @ApiConflictResponse({ description: 'VIDEO_NOT_AVAILABLE' })
  @ApiNotFoundResponse({ description: 'Recording or hook not found' })
  @HttpCode(202)
  @Post(':id/hooks/:hookId/export')
  exportFromHook(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Param('hookId', ParseIntPipe) hookId: number,
    @Body(new ZodValidationPipe(exportHookClipRequestSchema)) body: ExportHookClipRequest,
  ) {
    return this.clipsService.exportFromHook(id, hookId, ownership(actor), body);
  }
}
