import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';

@Injectable()
export class RecordingRepository extends Repository<Recording> {
  constructor(dataSource: DataSource) {
    super(Recording, dataSource.createEntityManager());
  }

  async listForUser(userId: number): Promise<Recording[]> {
    return this.find({
      where: { project: { userId, deletedAt: IsNull() } },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdForUser(id: number, userId: number): Promise<Recording | null> {
    return this.findOne({ where: { id, project: { userId, deletedAt: IsNull() } } });
  }

  async listByProjectIds(projectIds: number[]): Promise<Recording[]> {
    if (projectIds.length === 0) {
      return [];
    }
    return this.find({
      where: { projectId: In(projectIds) },
      select: ['id', 'projectId', 'createdAt', 'thumbnailStorageKey'],
    });
  }
}
