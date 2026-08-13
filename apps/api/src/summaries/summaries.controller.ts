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
import { SummariesService } from './summaries.service';

@ApiTags('Summaries')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @ApiOperation({ summary: 'Get the AI summary for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Summary text and metadata',
    schema: {
      example: {
        id: 1,
        recordingId: 10,
        text: 'The episode covers roadmap tradeoffs.',
        createdAt: '2026-08-13T08:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Recording or summary not found' })
  @Get(':id/summary')
  getByRecordingId(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.summariesService.getByRecordingId(id, user.id);
  }

  @ApiOperation({ summary: 'Trigger AI summary generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Summary job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/summary')
  create(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.summariesService.create(id, user.id);
  }
}
