import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { TranscriptSegmentRow } from '@mintreels/schema';

@Entity({ name: 'transcript_segments' })
export class TranscriptSegment implements TranscriptSegmentRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

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
