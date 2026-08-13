import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KnowledgeBaseScope, type KnowledgeBaseRow } from '@mintreels/schema';
import { Project } from './project.entity';

@Entity({ name: 'knowledge_bases' })
export class KnowledgeBase implements KnowledgeBaseRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  @ManyToOne(() => Project, (project) => project.knowledgeBases)
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  scope!: KnowledgeBaseScope;

  @Column({ type: 'text' })
  provider!: string;

  @Column({ type: 'text', name: 'provider_knowledge_base_id' })
  providerKnowledgeBaseId!: string;

  @Column({ type: 'int', name: 'recording_id', nullable: true })
  recordingId!: number | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
