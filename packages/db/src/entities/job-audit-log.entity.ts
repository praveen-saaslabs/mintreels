import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { JobAuditLogRow } from '@mintreels/schema';
import { Job } from './job.entity';

@Index('job_audit_logs_job_created_idx', ['jobId', 'createdAt'])
@Entity({ name: 'job_audit_logs' })
export class JobAuditLog implements JobAuditLogRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'job_id' })
  jobId!: number;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job?: Job;

  @Column({ type: 'text', nullable: true })
  step!: string | null;

  @Column({ type: 'text' })
  event!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
