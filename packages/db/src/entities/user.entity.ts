import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserRow } from '@mintreels/schema';

@Entity({ name: 'users' })
export class User implements UserRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
