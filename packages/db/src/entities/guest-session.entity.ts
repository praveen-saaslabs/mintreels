import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GuestSessionStatus, type GuestSessionRow } from '@mintreels/schema';

// Indexes (guest_id, token_hash unique; expires_at) are created in the migration,
// consistent with the rest of the schema (synchronize is off).
@Entity({ name: 'guest_sessions' })
export class GuestSession implements GuestSessionRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  /** Opaque public identifier used as the ownership key on projects. */
  @Column({ type: 'varchar', length: 255, name: 'guest_id' })
  guestId!: string;

  /** Hash of the cookie secret; the raw secret is never stored. */
  @Column({ type: 'varchar', length: 255, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 32, default: GuestSessionStatus.Active })
  status!: GuestSessionStatus;

  /** Set once the session is claimed by a real user. */
  @Column({ type: 'int', name: 'user_id', nullable: true })
  userId!: number | null;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', name: 'last_seen_at' })
  lastSeenAt!: Date;

  @Column({ type: 'datetime', name: 'claimed_at', nullable: true })
  claimedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
