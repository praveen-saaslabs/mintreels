import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { RecordingStatus, type RecordingRow } from '@mintreels/schema';
import type { Clip } from './clip.entity';
import type { Hook } from './hook.entity';
import type { Job } from './job.entity';
import { Project } from './project.entity';
import type { Summary } from './summary.entity';
import type { Transcript } from './transcript.entity';
import type { TranscriptSegment } from './transcript-segment.entity';

@Entity({ name: 'recordings' })
export class Recording implements RecordingRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @ManyToOne(() => Project, (project) => project.recordings)
  @JoinColumn({ name: 'project_id' })
  project?: Relation<Project>;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', name: 'original_filename' })
  originalFilename!: string;

  @Column({ type: 'text', name: 'storage_key' })
  storageKey!: string;

  @Column({ type: 'text', name: 'audio_storage_key', nullable: true })
  audioStorageKey!: string | null;

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

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @OneToOne('Transcript', (transcript: Transcript) => transcript.recording)
  transcript?: Relation<Transcript | null>;

  @OneToOne('Summary', (summary: Summary) => summary.recording)
  summary?: Relation<Summary | null>;

  @OneToMany('TranscriptSegment', (segment: TranscriptSegment) => segment.recording)
  segments?: Relation<TranscriptSegment[]>;

  @OneToMany('Hook', (hook: Hook) => hook.recording)
  hooks?: Relation<Hook[]>;

  @OneToMany('Clip', (clip: Clip) => clip.recording)
  clips?: Relation<Clip[]>;

  @OneToMany('Job', (job: Job) => job.recording)
  jobs?: Relation<Job[]>;
}
