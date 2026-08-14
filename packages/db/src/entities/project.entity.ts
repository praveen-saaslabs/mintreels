import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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

  // Owner is exactly one of userId / guestId (XOR — enforced by DB CHECK + service layer).
  @Column({ type: 'int', name: 'user_id', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 255, name: 'guest_id', nullable: true })
  guestId!: string | null;

  @Column({ type: 'text' })
  name!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @OneToMany('Recording', (recording: Recording) => recording.project)
  recordings?: Relation<Recording[]>;

  @OneToMany('KnowledgeBase', (knowledgeBase: KnowledgeBase) => knowledgeBase.project)
  knowledgeBases?: Relation<KnowledgeBase[]>;
}
