import { Controller, Delete, Get, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createRecordingRequestSchema,
  type CreateRecordingRequest,
} from './recordings.dto';
import { RecordingsService } from './recordings.service';

@Controller('api/recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  create(@Body() body: unknown) {
    console.error('[RecordingsController.create] body=', JSON.stringify(body));
    return this.recordingsService.create(
      createRecordingRequestSchema.parse(body) as CreateRecordingRequest,
    );
  }

  @Get()
  list() {
    return this.recordingsService.list();
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.getById(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.remove(id);
  }

  @Post(':id/add-to-global-kb')
  addToGlobalKnowledgeBase(@Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.addToGlobalKnowledgeBase(id);
  }
}
