import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  // TODO: implement project persistence
  async list(): Promise<Project[]> {
    throw new Error('ProjectRepository.list is not implemented');
  }

  async findById(_id: number): Promise<Project | null> {
    throw new Error('ProjectRepository.findById is not implemented');
  }
}
