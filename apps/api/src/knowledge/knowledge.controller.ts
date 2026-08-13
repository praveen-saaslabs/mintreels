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
import { KnowledgeBaseScope } from '@mintreels/schema';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
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
  @ApiOkResponse({
    description: 'Array of knowledge base objects',
    schema: {
      example: [
        {
          id: 1,
          projectId: 2,
          name: 'Global KB',
          scope: KnowledgeBaseScope.Global,
          provider: 'pyai',
          providerKnowledgeBaseId: 'kb_abc',
          recordingId: null,
          createdAt: '2026-08-13T08:00:00.000Z',
          updatedAt: '2026-08-13T08:00:00.000Z',
        },
      ],
    },
  })
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.knowledgeService.list(user.id);
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
