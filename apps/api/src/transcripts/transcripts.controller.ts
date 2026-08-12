import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TranscriptsService } from './transcripts.service';

@Controller('api/recordings')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Get(':id/transcript')
  getByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getByRecordingId(id);
  }

  @Get(':id/transcript.vtt')
  getVttByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getVttByRecordingId(id);
  }

  @Get(':id/summary')
  getSummaryByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getSummaryByRecordingId(id);
  }
}
