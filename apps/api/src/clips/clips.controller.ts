import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createClipRequestSchema, type CreateClipRequest } from './clips.dto';
import { ClipsService } from './clips.service';

@Controller('api/clips')
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createClipRequestSchema)) body: CreateClipRequest) {
    return this.clipsService.create(body);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.clipsService.getById(id);
  }
}
