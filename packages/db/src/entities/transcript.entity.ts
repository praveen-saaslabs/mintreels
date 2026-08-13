import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
