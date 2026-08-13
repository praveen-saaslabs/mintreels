import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { JobStepName, JobStepStatus, type JobStepRow } from '@mintreels/schema';
import { Job } from './job.entity';

@Unique('job_steps_job_step_unique', ['jobId', 'step'])
@Index('job_steps_job_id_idx', ['jobId'])
@Entity({ name: 'job_steps' })
export class JobStep implements JobStepRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'job_id' })
  jobId!: number;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job?: Job;

  @Column({ type: 'text' })
  step!: JobStepName;

  @Column({ type: 'text' })
  status!: JobStepStatus;

  @Column({ type: 'int', default: 0 })
  attempt!: number;

  @Column({ type: 'int', name: 'max_attempts', default: 4 })
  maxAttempts!: number;

  @Column({ type: 'text', nullable: true })
  provider!: string | null;

  @Column({ type: 'text', name: 'provider_job_id', nullable: true })
  providerJobId!: string | null;

  @Column({ type: 'text', name: 'idempotency_key' })
  idempotencyKey!: string;

  @Column({ type: 'json', nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  error!: Record<string, unknown> | null;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
