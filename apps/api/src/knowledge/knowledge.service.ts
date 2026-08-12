import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';
import type { CreateKnowledgeBaseRequest } from './knowledge.dto';

@Injectable()
export class KnowledgeService {
  async list(): Promise<never> {
    notImplemented('knowledgeService.list');
  }

  async create(_body: CreateKnowledgeBaseRequest): Promise<never> {
    notImplemented('knowledgeService.create');
  }
}
