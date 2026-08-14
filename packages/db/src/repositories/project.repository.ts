import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { type OwnerFilter, ownerWhere } from './ownership';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async listForOwner(owner: OwnerFilter): Promise<Project[]> {
    return this.find({ where: ownerWhere(owner), order: { updatedAt: 'DESC' } });
  }

  async findByIdForOwner(id: number, owner: OwnerFilter): Promise<Project | null> {
    return this.findOne({ where: { id, ...ownerWhere(owner) } });
  }
}
