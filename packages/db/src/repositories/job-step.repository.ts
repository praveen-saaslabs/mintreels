import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { JobStepName } from '@mintreels/schema';
import { JobStep } from '../entities/job-step.entity';

@Injectable()
export class JobStepRepository extends Repository<JobStep> {
  constructor(dataSource: DataSource) {
    super(JobStep, dataSource.createEntityManager());
  }

  async findByJobIdAndStep(jobId: number, step: JobStepName): Promise<JobStep | null> {
    return this.findOne({ where: { jobId, step } });
  }

  async listByJobId(jobId: number): Promise<JobStep[]> {
    return this.find({ where: { jobId }, order: { id: 'ASC' } });
  }
}
