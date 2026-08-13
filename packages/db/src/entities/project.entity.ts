import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProjectRow } from '@mintreels/schema';
import { KnowledgeBase } from './knowledge-base.entity';
import { Recording } from './recording.entity';

@Entity({ name: 'projects' })
export class Project implements ProjectRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'user_id' })
  userId!: number;

  @Column({ type: 'text' })
  name!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Recording, (recording) => recording.project)
  recordings?: Recording[];

  @OneToMany(() => KnowledgeBase, (knowledgeBase) => knowledgeBase.project)
  knowledgeBases?: KnowledgeBase[];
}
