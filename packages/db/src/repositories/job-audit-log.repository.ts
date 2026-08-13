import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JobAuditLog } from '../entities/job-audit-log.entity';

@Injectable()
export class JobAuditLogRepository extends Repository<JobAuditLog> {
  constructor(dataSource: DataSource) {
    super(JobAuditLog, dataSource.createEntityManager());
  }

  async listByJobId(jobId: number): Promise<JobAuditLog[]> {
    return this.find({ where: { jobId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }
}
