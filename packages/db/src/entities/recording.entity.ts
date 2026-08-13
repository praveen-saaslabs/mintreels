import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RecordingStatus, type RecordingRow } from '@mintreels/schema';
import { Clip } from './clip.entity';
import { Hook } from './hook.entity';
import { Job } from './job.entity';
import { Project } from './project.entity';
import { Summary } from './summary.entity';
import { Transcript } from './transcript.entity';
import { TranscriptSegment } from './transcript-segment.entity';

@Entity({ name: 'recordings' })
export class Recording implements RecordingRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @ManyToOne(() => Project, (project) => project.recordings)
  @JoinColumn({ name: 'project_id' })
  project?: Project;

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

  @OneToOne(() => Transcript, (transcript) => transcript.recording)
  transcript?: Transcript | null;

  @OneToOne(() => Summary, (summary) => summary.recording)
  summary?: Summary | null;

  @OneToMany(() => TranscriptSegment, (segment) => segment.recording)
  segments?: TranscriptSegment[];

  @OneToMany(() => Hook, (hook) => hook.recording)
  hooks?: Hook[];

  @OneToMany(() => Clip, (clip) => clip.recording)
  clips?: Clip[];

  @OneToMany(() => Job, (job) => job.recording)
  jobs?: Job[];
}
