import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
  createRecordingRequestSchema,
  type CreateRecordingRequest,
} from './recordings.dto';
import { RecordingsService } from './recordings.service';

@ApiTags('Recordings')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @ApiOperation({ summary: 'Create a recording and enqueue ingest' })
  @ApiCreatedResponse({ description: 'Recording created; ingest job enqueued' })
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createRecordingRequestSchema)) body: CreateRecordingRequest,
  ) {
    return this.recordingsService.create(body, user.id);
  }

  @ApiOperation({ summary: 'List recordings for the current user' })
  @ApiOkResponse({ description: 'Array of recording objects' })
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.recordingsService.list(user.id);
  }

  @ApiOperation({ summary: 'Get a single recording by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Recording object' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.getById(id, user.id);
  }

  @ApiOperation({ summary: 'Delete a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Recording deleted' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.recordingsService.remove(id, user.id);
  }

  @ApiOperation({ summary: 'Add recording to the global knowledge base' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'KB sync job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/add-to-global-kb')
  addToGlobalKnowledgeBase(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordingsService.addToGlobalKnowledgeBase(id, user.id);
  }
}
