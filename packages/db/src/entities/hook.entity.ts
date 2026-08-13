import { EmbeddingStatus, HookStatus, HookType, type HookRow } from '@mintreels/schema';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recording } from './recording.entity';

@Index('hooks_recording_start_idx', ['recordingId', 'startMs'])
@Index('hooks_recording_status_idx', ['recordingId', 'status'])
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

  @Column({ type: 'int', name: 'start_segment_id', nullable: true })
  startSegmentId!: number | null;

  @Column({ type: 'int', name: 'end_segment_id', nullable: true })
  endSegmentId!: number | null;

  @Column({ type: 'text', name: 'hook_type', nullable: true })
  hookType!: HookType | null;

  @Column({ type: 'text', name: 'context_text', nullable: true })
  contextText!: string | null;

  @Column({ type: 'double', name: 'quality_score', nullable: true })
  qualityScore!: number | null;

  @Column({ type: 'double', name: 'standalone_score', nullable: true })
  standaloneScore!: number | null;

  @Column({ type: 'double', name: 'curiosity_score', nullable: true })
  curiosityScore!: number | null;

  @Column({ type: 'double', name: 'emotional_score', nullable: true })
  emotionalScore!: number | null;

  @Column({ type: 'double', name: 'specificity_score', nullable: true })
  specificityScore!: number | null;

  @Column({ type: 'double', name: 'shareability_score', nullable: true })
  shareabilityScore!: number | null;

  @Column({ type: 'double', name: 'novelty_score', nullable: true })
  noveltyScore!: number | null;

  @Column({ type: 'varchar', length: 32, default: HookStatus.Candidate })
  status!: HookStatus;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'embedding_status',
    default: EmbeddingStatus.Pending,
  })
  embeddingStatus!: EmbeddingStatus;

  @Column({ type: 'int', name: 'clip_start_ms', nullable: true })
  clipStartMs!: number | null;

  @Column({ type: 'int', name: 'clip_end_ms', nullable: true })
  clipEndMs!: number | null;

  @Column({ type: 'text', nullable: true })
  provider!: string | null;

  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @Column({ type: 'text', name: 'prompt_version', nullable: true })
  promptVersion!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
