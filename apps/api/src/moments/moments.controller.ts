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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
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
@UseGuards(AuthGuard)
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
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(searchMomentsRequestSchema)) body: SearchMomentsRequest,
  ) {
    return this.momentsService.search(id, user.id, body);
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
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(askMomentsRequestSchema)) body: AskMomentsRequest,
  ) {
    return this.momentsService.ask(id, user.id, body);
  }
}
