import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { HooksService } from './hooks.service';

@ApiTags('Hooks')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

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
}
