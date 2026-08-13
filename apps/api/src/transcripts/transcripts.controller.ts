import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { TranscriptsService } from './transcripts.service';

@ApiTags('Transcripts')
@Controller('api/recordings')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @ApiOperation({ summary: 'Get the JSON transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Transcript with timestamped segments' })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Get(':id/transcript')
  getByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getByRecordingId(id);
  }

  @ApiOperation({ summary: 'Get the WebVTT transcript for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiProduces('text/vtt')
  @ApiOkResponse({ description: 'Transcript in WebVTT format', content: { 'text/vtt': {} } })
  @ApiNotFoundResponse({ description: 'Recording or transcript not found' })
  @Get(':id/transcript.vtt')
  getVttByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getVttByRecordingId(id);
  }

  @ApiOperation({ summary: 'Get the AI summary for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Summary text and metadata' })
  @ApiNotFoundResponse({ description: 'Recording or summary not found' })
  @Get(':id/summary')
  getSummaryByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.transcriptsService.getSummaryByRecordingId(id);
  }
}
