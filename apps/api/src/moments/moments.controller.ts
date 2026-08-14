import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { IdentityGuard } from '../guest/identity.guard';
import { GuestRateLimitGuard, RateLimit } from '../guest/guest-rate-limit.guard';
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  askMomentsRequestSchema,
  searchMomentsRequestSchema,
  type AskMomentsRequest,
  type SearchMomentsRequest,
} from './moments.dto';
import { MomentsService } from './moments.service';

@ApiTags('Moments')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
@RateLimit('ai-generations')
@Controller('api/recordings/:id/moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @ApiOperation({ summary: 'Search timestamped transcript moments with a natural-language prompt' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Ranked moment candidates with clip-padded timestamps',
    schema: {
      example: {
        moments: [
          {
            startMs: 12000,
            endMs: 42000,
            clipStartMs: 9000,
            clipEndMs: 47000,
            title: 'The enterprise plan starts at',
            excerpt: 'We should talk about pricing. The enterprise plan starts at ninety nine.',
            similarity: 0.82,
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  @ApiConflictResponse({ description: 'TRANSCRIPT_REQUIRED or TRANSCRIPT_INDEX_NOT_READY' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post('search')
  search(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(searchMomentsRequestSchema)) body: SearchMomentsRequest,
  ) {
    return this.momentsService.search(id, ownership(actor), body);
  }

  @ApiOperation({
    summary: 'Ask the transcript, find a clip, or get a refusal for off-topic prompts',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'answer | moments | reject',
    schema: {
      example: { kind: 'answer', text: 'They said the enterprise plan starts at ninety nine.' },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  @ApiConflictResponse({ description: 'TRANSCRIPT_REQUIRED or TRANSCRIPT_INDEX_NOT_READY' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post('ask')
  ask(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(askMomentsRequestSchema)) body: AskMomentsRequest,
  ) {
    return this.momentsService.ask(id, ownership(actor), body);
  }
}
