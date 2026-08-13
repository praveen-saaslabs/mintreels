import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createKnowledgeBaseRequestSchema,
  type CreateKnowledgeBaseRequest,
} from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge Bases')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
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
