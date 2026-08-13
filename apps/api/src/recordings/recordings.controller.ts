import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createRecordingRequestSchema,
  type CreateRecordingRequest,
} from './recordings.dto';
import { RecordingsService } from './recordings.service';

@ApiTags('Recordings')
@Controller('api/recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @ApiOperation({ summary: 'Create a recording and enqueue ingest' })
  @ApiCreatedResponse({ description: 'Recording created; ingest job enqueued' })
  @Post()
  create(
    @Body(new ZodValidationPipe(createRecordingRequestSchema)) body: CreateRecordingRequest,
  ) {
    return this.recordingsService.create(body);
  }

  @ApiOperation({ summary: 'List all recordings' })
  @ApiOkResponse({ description: 'Array of recording objects' })
  @Get()
  list() {
    return this.recordingsService.list();
  }

  @ApiOperation({ summary: 'Get a single recording by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Recording object' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.getById(id);
  }

  @ApiOperation({ summary: 'Delete a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Recording deleted' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.remove(id);
  }

  @ApiOperation({ summary: 'Add recording to the global knowledge base' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'KB sync job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/add-to-global-kb')
  addToGlobalKnowledgeBase(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.addToGlobalKnowledgeBase(id);
  }
}
