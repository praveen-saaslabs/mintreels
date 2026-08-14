import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { JobAuditLog } from '../entities/job-audit-log.entity';

@Injectable()
export class JobAuditLogRepository extends Repository<JobAuditLog> {
  constructor(dataSource: DataSource) {
    super(JobAuditLog, dataSource.createEntityManager());
  }

  async listByJobId(jobId: number): Promise<JobAuditLog[]> {
    return this.find({ where: { jobId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }

  async listByJobIds(jobIds: readonly number[]): Promise<JobAuditLog[]> {
    if (jobIds.length === 0) {
      return [];
    }
    return this.find({
      where: { jobId: In([...jobIds]) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }
}
