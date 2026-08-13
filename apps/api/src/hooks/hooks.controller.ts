import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClipStatus } from '@mintreels/schema';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { ClipsService } from '../clips/clips.service';
import { HooksService } from './hooks.service';

@ApiTags('Hooks')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
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
  listByRecordingId(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.hooksService.listByRecordingId(id, user.id);
  }

  @ApiOperation({ summary: 'Trigger AI hook generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Hook generation job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/hooks/generate')
  generate(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.hooksService.generate(id, user.id);
  }

  @ApiOperation({ summary: 'Export a clip from a hook time range' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'hookId', type: Number })
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
        subtitleStyle: null,
        videoUrl: null,
        thumbnailUrl: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'INVALID_HOOK_RANGE' })
  @ApiConflictResponse({ description: 'VIDEO_NOT_AVAILABLE' })
  @ApiNotFoundResponse({ description: 'Recording or hook not found' })
  @HttpCode(202)
  @Post(':id/hooks/:hookId/export')
  exportFromHook(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('hookId', ParseIntPipe) hookId: number,
  ) {
    return this.clipsService.exportFromHook(id, hookId, user.id);
  }
}
