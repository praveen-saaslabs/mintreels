import { Injectable } from '@nestjs/common';
import { KnowledgeBaseRepository } from '@mintreels/db';
import { notImplemented } from '../common/http-error';
import type { CreateKnowledgeBaseRequest } from './knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(private readonly knowledgeBases: KnowledgeBaseRepository) {}

  async list(userId: number) {
    return this.knowledgeBases.listForUser(userId);
  }

  async create(_body: CreateKnowledgeBaseRequest): Promise<never> {
    notImplemented('knowledgeService.create');
  }
}
