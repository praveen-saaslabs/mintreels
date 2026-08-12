import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createKnowledgeBaseRequestSchema,
  type CreateKnowledgeBaseRequest,
} from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@Controller('api/knowledge-bases')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  list() {
    return this.knowledgeService.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createKnowledgeBaseRequestSchema))
    body: CreateKnowledgeBaseRequest,
  ) {
    return this.knowledgeService.create(body);
  }
}
