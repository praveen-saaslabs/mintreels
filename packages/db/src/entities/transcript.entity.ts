import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { TranscriptRow } from '@mintreels/schema';

@Entity({ name: 'transcripts' })
export class Transcript implements TranscriptRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @Column({ type: 'text', nullable: true })
  language!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
