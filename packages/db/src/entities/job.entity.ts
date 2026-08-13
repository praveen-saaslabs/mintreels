import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus, JobType, type JobRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'jobs' })
export class Job implements JobRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'text' })
  type!: JobType;

  @Column({ type: 'int', name: 'recording_id', nullable: true })
  recordingId!: number | null;

  @ManyToOne(() => Recording, (recording) => recording.jobs, { nullable: true })
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording | null;

  @Column({ type: 'text' })
  status!: JobStatus;

  @Column({ type: 'int', default: 0 })
  attempt!: number;

  @Column({ type: 'int', name: 'max_attempts', default: 4 })
  maxAttempts!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'text', name: 'error_code', nullable: true })
  errorCode!: string | null;

  @Column({ type: 'json', name: 'error_metadata', nullable: true })
  errorMetadata!: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'current_step', nullable: true })
  currentStep!: string | null;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', name: 'finished_at', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', nullable: true })
  updatedAt!: Date | null;
}
