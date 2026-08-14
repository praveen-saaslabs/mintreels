import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
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
import { SummariesService } from './summaries.service';

@ApiTags('Summaries')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
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
  getByRecordingId(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.summariesService.getByRecordingId(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Trigger AI summary generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Summary job enqueued' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @RateLimit('ai-generations')
  @Post(':id/summary')
  create(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.summariesService.create(id, ownership(actor));
  }
}
