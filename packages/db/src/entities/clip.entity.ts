import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClipFitMode, ClipRatio, ClipStatus, type ClipRow } from '@mintreels/schema';
import { Recording } from './recording.entity';

@Entity({ name: 'clips' })
export class Clip implements ClipRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'recording_id' })
  recordingId!: number;

  @ManyToOne(() => Recording, (recording) => recording.clips)
  @JoinColumn({ name: 'recording_id' })
  recording?: Recording;

  @Column({ type: 'int', name: 'hook_id', nullable: true })
  hookId!: number | null;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'varchar', length: 120, name: 'social_title', nullable: true })
  socialTitle!: string | null;

  @Column({ type: 'text', name: 'social_description', nullable: true })
  socialDescription!: string | null;

  @Column({ type: 'int', name: 'start_ms' })
  startMs!: number;

  @Column({ type: 'int', name: 'end_ms' })
  endMs!: number;

  @Column({ type: 'varchar', length: 16, name: 'aspect_ratio', default: ClipRatio.Vertical })
  aspectRatio!: ClipRatio;

  @Column({ type: 'varchar', length: 16, name: 'fit_mode', default: ClipFitMode.Fit })
  fitMode!: ClipFitMode;

  @Column({ type: 'boolean', name: 'burn_subtitles', default: true })
  burnSubtitles!: boolean;

  @Column({ type: 'text', name: 'subtitle_style', nullable: true })
  subtitleStyle!: string | null;

  @Column({ type: 'text', name: 'storage_key', nullable: true })
  storageKey!: string | null;

  @Column({ type: 'text', name: 'thumbnail_storage_key', nullable: true })
  thumbnailStorageKey!: string | null;

  @Column({ type: 'text' })
  status!: ClipStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
