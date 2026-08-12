import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';

@Injectable()
export class KnowledgeDocumentRepository extends Repository<KnowledgeDocument> {
  constructor(dataSource: DataSource) {
    super(KnowledgeDocument, dataSource.createEntityManager());
  }

  // TODO: implement knowledge document persistence
  async listByKnowledgeBaseId(_knowledgeBaseId: number): Promise<KnowledgeDocument[]> {
    throw new Error('KnowledgeDocumentRepository.listByKnowledgeBaseId is not implemented');
  }
}
