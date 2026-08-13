import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import type { JobStatus, JobType } from '@mintreels/schema';
import { Job } from '../entities/job.entity';

@Injectable()
export class JobRepository extends Repository<Job> {
  constructor(dataSource: DataSource) {
    super(Job, dataSource.createEntityManager());
  }

  async listByRecordingIds(recordingIds: number[], statuses?: JobStatus[]): Promise<Job[]> {
    if (recordingIds.length === 0) {
      return [];
    }
    return this.find({
      where: statuses
        ? { recordingId: In(recordingIds), status: In(statuses) }
        : { recordingId: In(recordingIds) },
      select: ['id', 'recordingId', 'status'],
    });
  }

  async findLatestByRecordingAndType(recordingId: number, type: JobType): Promise<Job | null> {
    return this.findOne({
      where: { recordingId, type },
      order: { createdAt: 'DESC' },
    });
  }
}
