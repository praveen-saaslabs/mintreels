import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { type OwnerFilter, ownerWhere } from './ownership';

@Injectable()
export class RecordingRepository extends Repository<Recording> {
  constructor(dataSource: DataSource) {
    super(Recording, dataSource.createEntityManager());
  }

  async listForOwner(owner: OwnerFilter): Promise<Recording[]> {
    return this.find({
      where: { project: { ...ownerWhere(owner), deletedAt: IsNull() } },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdForOwner(id: number, owner: OwnerFilter): Promise<Recording | null> {
    return this.findOne({ where: { id, project: { ...ownerWhere(owner), deletedAt: IsNull() } } });
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
