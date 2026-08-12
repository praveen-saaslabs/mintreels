import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeBase } from '../entities/knowledge-base.entity';

@Injectable()
export class KnowledgeBaseRepository extends Repository<KnowledgeBase> {
  constructor(dataSource: DataSource) {
    super(KnowledgeBase, dataSource.createEntityManager());
  }

  // TODO: implement knowledge base persistence
  async list(): Promise<KnowledgeBase[]> {
    throw new Error('KnowledgeBaseRepository.list is not implemented');
  }

  async findById(_id: number): Promise<KnowledgeBase | null> {
    throw new Error('KnowledgeBaseRepository.findById is not implemented');
  }
}
