import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { KnowledgeBaseScope } from '@mintreels/schema';
import { KnowledgeBase } from '../entities/knowledge-base.entity';

@Injectable()
export class KnowledgeBaseRepository extends Repository<KnowledgeBase> {
  constructor(dataSource: DataSource) {
    super(KnowledgeBase, dataSource.createEntityManager());
  }

  async listForUser(userId: number): Promise<KnowledgeBase[]> {
    return this.find({
      where: { project: { userId, deletedAt: IsNull() } },
      order: { updatedAt: 'DESC' },
    });
  }

  async listGlobalByProjectIds(projectIds: number[]): Promise<KnowledgeBase[]> {
    if (projectIds.length === 0) {
      return [];
    }
    return this.find({
      where: { projectId: In(projectIds), scope: KnowledgeBaseScope.Global },
      select: ['id', 'projectId', 'scope'],
    });
  }
}
