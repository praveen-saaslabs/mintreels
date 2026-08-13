import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import type { ProjectRow } from '@mintreels/schema';
import type { KnowledgeBase } from './knowledge-base.entity';
import type { Recording } from './recording.entity';

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

  @OneToMany('Recording', (recording: Recording) => recording.project)
  recordings?: Relation<Recording[]>;

  @OneToMany('KnowledgeBase', (knowledgeBase: KnowledgeBase) => knowledgeBase.project)
  knowledgeBases?: Relation<KnowledgeBase[]>;
}
