import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { KnowledgeBaseRow, KnowledgeBaseScope } from '@mintreels/schema';

@Entity({ name: 'knowledge_bases' })
export class KnowledgeBase implements KnowledgeBaseRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

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
}
