import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SummariesService } from './summaries.service';

@ApiTags('Summaries')
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
