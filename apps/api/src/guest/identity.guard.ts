import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_COOKIE_NAME } from '../common/auth.config';
import { GUEST_COOKIE_NAME, guestCookieOptions } from '../common/guest.config';
import { HttpError } from '../common/http-error';
import { JwtService } from '../auth/jwt.service';
import type { RequestActor } from '../auth/auth.types';
import { GuestSessionService } from './guest-session.service';

/**
 * Resolves a request principal for guest-enabled routes:
 *   1. auth_token cookie present  → user (takes precedence over any guest cookie)
 *   2. valid guest_session cookie → guest
 *   3. otherwise                  → lazily create a guest session + Set-Cookie
 * Attaches the result to req.actor for @CurrentActor().
 */
@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly guests: GuestSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string | undefined>;
      actor?: RequestActor;
    }>();

    // 1. An authenticated user always wins over a stale guest cookie.
    const authToken = request.cookies?.[AUTH_COOKIE_NAME];
    if (authToken) {
      request.actor = { type: 'user', userId: this.jwt.verify(authToken).id };
      return true;
    }

    if (!this.guests.enabled) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }

    // 2. Reuse an existing valid guest session.
    const existing = await this.guests.resolveByToken(request.cookies?.[GUEST_COOKIE_NAME]);
    if (existing) {
      request.actor = { type: 'guest', guestId: existing.guestId };
      return true;
    }

    // 3. Lazily create a guest session and set the cookie.
    const { session, token } = await this.guests.create();
    const response = context.switchToHttp().getResponse<Response>();
    response.cookie(GUEST_COOKIE_NAME, token, guestCookieOptions(this.guests.ttlSeconds));
    request.actor = { type: 'guest', guestId: session.guestId };
    return true;
  }
}
