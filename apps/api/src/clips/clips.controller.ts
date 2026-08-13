import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createClipRequestSchema, type CreateClipRequest } from './clips.dto';
import { ClipsService } from './clips.service';

@ApiTags('Clips')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/clips')
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @ApiOperation({ summary: 'Create a clip from a recording segment' })
  @ApiCreatedResponse({ description: 'Clip created; render job enqueued' })
  @Post()
  create(@Body(new ZodValidationPipe(createClipRequestSchema)) body: CreateClipRequest) {
    return this.clipsService.create(body);
  }

  @ApiOperation({ summary: 'Get a clip by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Clip object with status and download URL when ready' })
  @ApiNotFoundResponse({ description: 'Clip not found' })
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.clipsService.getById(id);
  }
}
