import { Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { SummariesService } from './summaries.service';

@ApiTags('Summaries')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @ApiOperation({ summary: 'Trigger AI summary generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Summary job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/summary')
  create(@Param('id', ParseIntPipe) id: number) {
    return this.summariesService.create(id);
  }
}
