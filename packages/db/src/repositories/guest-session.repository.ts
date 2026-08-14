import { Injectable } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { GuestSessionStatus } from '@mintreels/schema';
import { GuestSession } from '../entities/guest-session.entity';

@Injectable()
export class GuestSessionRepository extends Repository<GuestSession> {
  constructor(dataSource: DataSource) {
    super(GuestSession, dataSource.createEntityManager());
  }

  async findActiveByTokenHash(tokenHash: string): Promise<GuestSession | null> {
    return this.findOne({ where: { tokenHash, status: GuestSessionStatus.Active } });
  }

  async findByGuestId(guestId: string): Promise<GuestSession | null> {
    return this.findOne({ where: { guestId } });
  }

  /** Active sessions whose TTL has passed — candidates for expiry/cleanup. */
  async listExpired(now: Date): Promise<GuestSession[]> {
    return this.find({
      where: { status: GuestSessionStatus.Active, expiresAt: LessThan(now) },
    });
  }

  /**
   * Sessions eligible for data purge: their TTL passed before `retentionCutoff`
   * (i.e. now - retention). Claimed/Revoked sessions are never returned so real
   * users' reassigned data is left untouched.
   */
  async listPurgeable(retentionCutoff: Date): Promise<GuestSession[]> {
    return this.find({
      where: [
        { status: GuestSessionStatus.Expired, expiresAt: LessThan(retentionCutoff) },
        { status: GuestSessionStatus.Active, expiresAt: LessThan(retentionCutoff) },
      ],
    });
  }
}
