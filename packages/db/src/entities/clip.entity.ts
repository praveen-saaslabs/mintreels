import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { ClipRow, ClipStatus } from '@mintreels/schema';

@Entity({ name: 'clips' })
export class Clip implements ClipRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @Column({ type: 'int', name: 'hook_id', nullable: true })
  hookId!: number | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'int', name: 'start_ms' })
  startMs!: number;

  @Column({ type: 'int', name: 'end_ms' })
  endMs!: number;

  @Column({ type: 'text', name: 'subtitle_style', nullable: true })
  subtitleStyle!: string | null;

  @Column({ type: 'text', name: 'storage_key', nullable: true })
  storageKey!: string | null;

  @Column({ type: 'text' })
  status!: ClipStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
