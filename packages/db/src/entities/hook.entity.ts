import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { HookRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'hooks' })
export class Hook implements HookRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @ManyToOne(() => Recording, (recording) => recording.hooks)
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording;

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
