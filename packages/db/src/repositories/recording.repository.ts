import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Recording } from '../entities/recording.entity';

@Injectable()
export class RecordingRepository extends Repository<Recording> {
  constructor(dataSource: DataSource) {
    super(Recording, dataSource.createEntityManager());
  }

  // TODO: implement recording persistence
  async list(): Promise<Recording[]> {
    throw new Error('RecordingRepository.list is not implemented');
  }

  async findById(_id: number): Promise<Recording | null> {
    throw new Error('RecordingRepository.findById is not implemented');
  }

  async listForUser(userId: number): Promise<Recording[]> {
    return this.ownedByUser(userId).getMany();
  }

  async findByIdForUser(id: number, userId: number): Promise<Recording | null> {
    return this.ownedByUser(userId).andWhere('recording.id = :id', { id }).getOne();
  }

  private ownedByUser(userId: number) {
    return this.createQueryBuilder('recording').innerJoin(
      Project,
      'project',
      'project.id = recording.projectId AND project.userId = :userId',
      { userId },
    );
  }
}
