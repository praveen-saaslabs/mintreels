import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Job } from '../entities/job.entity';

@Injectable()
export class JobRepository extends Repository<Job> {
  constructor(dataSource: DataSource) {
    super(Job, dataSource.createEntityManager());
  }

  // TODO: implement job persistence
  async findById(_id: number): Promise<Job | null> {
    throw new Error('JobRepository.findById is not implemented');
  }
}
