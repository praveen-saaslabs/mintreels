import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GuestSession, Project } from '@mintreels/db';
import { GuestSessionStatus } from '@mintreels/schema';
import { hashGuestToken } from './guest-token';

/**
 * Claims a guest session's data for a freshly-authenticated user.
 *
 * On login/verify we reassign every project owned by the guest to the user
 * (guest_id → null, user_id → the user) and mark the session Claimed. The whole
 * thing runs in one transaction and is idempotent: only Active sessions are
 * claimed, so a repeated login (or a login with no guest cookie) is a no-op.
 */
@Injectable()
export class GuestClaimService {
  private readonly logger = new Logger(GuestClaimService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * @param guestToken raw value of the guest_session cookie (may be undefined)
   * @param userId     the now-authenticated user to receive the guest's data
   * @returns whether a session was actually claimed (false = nothing to claim)
   */
  async claim(guestToken: string | undefined, userId: number): Promise<boolean> {
    if (!guestToken) {
      return false;
    }
    const tokenHash = hashGuestToken(guestToken);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const session = await manager.findOne(GuestSession, {
          where: { tokenHash, status: GuestSessionStatus.Active },
        });
        if (!session) {
          return false;
        }
        // Reassign ownership: guest projects become the user's (XOR invariant preserved).
        await manager.update(Project, { guestId: session.guestId }, { userId, guestId: null });
        session.status = GuestSessionStatus.Claimed;
        session.userId = userId;
        session.claimedAt = new Date();
        await manager.save(session);
        return true;
      });
    } catch (error) {
      // Never block login on a claim failure — the user still gets their session.
      this.logger.error(`Guest claim failed for user ${String(userId)}`, error as Error);
      return false;
    }
  }
}
