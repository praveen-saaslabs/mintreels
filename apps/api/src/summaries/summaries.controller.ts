import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SummariesService } from './summaries.service';

@Controller('api/recordings')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post(':id/summary')
  create(@Param('id', ParseIntPipe) id: number) {
    return this.summariesService.create(id);
  }
}
