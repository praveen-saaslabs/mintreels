import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { HooksService } from './hooks.service';

@Controller('api/recordings')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  @Get(':id/hooks')
  listByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.hooksService.listByRecordingId(id);
  }

  @Post(':id/hooks/generate')
  generate(@Param('id', ParseIntPipe) id: number) {
    return this.hooksService.generate(id);
  }
}
