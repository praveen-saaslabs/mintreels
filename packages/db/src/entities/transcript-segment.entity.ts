import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { TranscriptSegmentRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'transcript_segments' })
export class TranscriptSegment implements TranscriptSegmentRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @ManyToOne(() => Recording, (recording) => recording.segments)
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'int', name: 'start_ms' })
  startMs!: number;

  @Column({ type: 'int', name: 'end_ms' })
  endMs!: number;

  @Column({ type: 'text', nullable: true })
  speaker!: string | null;

  @Column({ type: 'text' })
  text!: string;
}
