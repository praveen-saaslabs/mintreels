import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { TranscriptRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'transcripts' })
export class Transcript implements TranscriptRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @ManyToOne(() => Recording, (recording) => recording.transcript)
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording;

  @Column({ type: 'text', nullable: true })
  language!: string | null;

  @Column({ type: 'text', nullable: true })
  provider!: string | null;

  @Column({ type: 'text', name: 'provider_job_id', nullable: true })
  providerJobId!: string | null;

  @Column({ type: 'text', nullable: true })
  status!: string | null;

  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'json', name: 'raw_response', nullable: true })
  rawResponse!: unknown | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
