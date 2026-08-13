import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async listForUser(userId: number): Promise<Project[]> {
    return this.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findByIdForUser(id: number, userId: number): Promise<Project | null> {
    return this.findOne({ where: { id, userId } });
  }
}
