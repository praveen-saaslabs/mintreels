import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { HookRow } from '@mintreels/schema';

@Entity({ name: 'hooks' })
export class Hook implements HookRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  hook!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'int', name: 'start_ms' })
  startMs!: number;

  @Column({ type: 'int', name: 'end_ms' })
  endMs!: number;

  @Column({ type: 'double', nullable: true })
  score!: number | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
