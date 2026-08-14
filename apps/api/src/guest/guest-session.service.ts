import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { GuestSessionRepository, type GuestSession } from '@mintreels/db';
import { GuestSessionStatus } from '@mintreels/schema';
import { loadGuestConfig, type GuestConfig } from '../common/guest.config';
import { hashGuestToken } from './guest-token';

@Injectable()
export class GuestSessionService {
  private readonly config: GuestConfig = loadGuestConfig();

  constructor(private readonly sessions: GuestSessionRepository) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  get ttlSeconds(): number {
    return this.config.sessionTtlSeconds;
  }

  /** Cookie carries a high-entropy random secret; only this hash is stored. */
  hashToken(token: string): string {
    return hashGuestToken(token);
  }

  /**
   * Resolve an active, unexpired session from the raw cookie token and bump
   * last_seen_at. Returns null when the token is missing/invalid/expired.
   */
  async resolveByToken(token: string | undefined): Promise<GuestSession | null> {
    if (!token) {
      return null;
    }
    const session = await this.sessions.findActiveByTokenHash(this.hashToken(token));
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    session.lastSeenAt = new Date();
    await this.sessions.save(session);
    return session;
  }

  /** Create a new active guest session; returns the raw cookie token once. */
  async create(): Promise<{ session: GuestSession; token: string }> {
    const token = randomBytes(32).toString('base64url');
    const guestId = `gst_${randomBytes(16).toString('hex')}`;
    const now = new Date();
    const session = await this.sessions.save(
      this.sessions.create({
        guestId,
        tokenHash: this.hashToken(token),
        status: GuestSessionStatus.Active,
        userId: null,
        expiresAt: new Date(now.getTime() + this.config.sessionTtlSeconds * 1000),
        lastSeenAt: now,
        claimedAt: null,
      }),
    );
    return { session, token };
  }
}
