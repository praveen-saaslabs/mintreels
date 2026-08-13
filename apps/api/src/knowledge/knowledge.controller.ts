import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createKnowledgeBaseRequestSchema,
  type CreateKnowledgeBaseRequest,
} from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge Bases')
@Controller('api/knowledge-bases')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @ApiOperation({ summary: 'List all knowledge bases' })
  @ApiOkResponse({ description: 'Array of knowledge base objects' })
  @Get()
  list() {
    return this.knowledgeService.list();
  }

  @ApiOperation({ summary: 'Create a new knowledge base' })
  @ApiCreatedResponse({ description: 'Knowledge base created' })
  @Post()
  create(
    @Body(new ZodValidationPipe(createKnowledgeBaseRequestSchema))
    body: CreateKnowledgeBaseRequest,
  ) {
    return this.knowledgeService.create(body);
  }
}
