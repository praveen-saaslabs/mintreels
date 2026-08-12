import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { RecordingRow, RecordingStatus } from '@mintreels/schema';

@Entity({ name: 'recordings' })
export class Recording implements RecordingRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', name: 'original_filename' })
  originalFilename!: string;

  @Column({ type: 'text', name: 'storage_key' })
  storageKey!: string;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'text' })
  status!: RecordingStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
