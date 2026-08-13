import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { SummaryRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'summaries' })
export class Summary implements SummaryRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @ManyToOne(() => Recording, (recording) => recording.summary)
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'json', name: 'action_items', nullable: true })
  actionItems!: SummaryRow['actionItems'];

  @Column({ type: 'json', name: 'key_points', nullable: true })
  keyPoints!: SummaryRow['keyPoints'];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
