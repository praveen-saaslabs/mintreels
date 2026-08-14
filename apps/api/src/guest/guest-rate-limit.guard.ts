import { Injectable, SetMetadata } from '@nestjs/common';
import type { CanActivate, CustomDecorator, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { loadGuestConfig, type GuestConfig } from '../common/guest.config';
import { HttpError } from '../common/http-error';
import type { RequestActor } from '../auth/auth.types';

/** Rate-limit buckets a route can select. Each maps to a limit in GuestConfig. */
export type RateLimitBucket = 'requests' | 'uploads' | 'transcriptions' | 'ai-generations';

/** Metadata key carrying the selected bucket for a handler. */
export const RATE_LIMIT_BUCKET = 'guest:rate-limit-bucket';

/**
 * Select which rate-limit bucket applies to a route. Without it the guard
 * falls back to the general per-minute `requests` bucket.
 *   @RateLimit('uploads')
 */
export const RateLimit = (bucket: RateLimitBucket): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_BUCKET, bucket);

interface Window {
  count: number;
  resetAt: number;
}

/** Fixed-window duration (ms) for each bucket. */
const WINDOW_MS: Record<RateLimitBucket, number> = {
  requests: 60_000,
  uploads: 60 * 60_000,
  transcriptions: 60 * 60_000,
  'ai-generations': 60 * 60_000,
};

/**
 * In-memory (per-process) fixed-window rate limiter for guests. Authenticated
 * users are never limited. The bucket is chosen per route via @RateLimit();
 * limits come from GuestConfig. Throws 429 RATE_LIMITED when exceeded.
 */
@Injectable()
export class GuestRateLimitGuard implements CanActivate {
  private readonly config: GuestConfig = loadGuestConfig();
  private readonly windows = new Map<string, Window>();
  private lastPrunedAt = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ actor?: RequestActor }>();
    const actor = request.actor;
    // Only guests are rate-limited; users (and unresolved requests) pass through.
    if (!actor || actor.type !== 'guest') {
      return true;
    }

    const bucket =
      this.reflector.getAllAndOverride<RateLimitBucket>(RATE_LIMIT_BUCKET, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'requests';

    const now = Date.now();
    this.prune(now);

    const limit = this.limitFor(bucket);
    const key = `${bucket}:${actor.guestId}`;
    const window = this.windows.get(key);
    if (!window || now >= window.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + WINDOW_MS[bucket] });
      return true;
    }

    if (window.count >= limit) {
      throw new HttpError(429, 'RATE_LIMITED');
    }
    window.count += 1;
    return true;
  }

  private limitFor(bucket: RateLimitBucket): number {
    switch (bucket) {
      case 'uploads':
        return this.config.uploadsPerHour;
      case 'transcriptions':
        return this.config.transcriptionsPerHour;
      case 'ai-generations':
        return this.config.aiGenerationsPerHour;
      case 'requests':
      default:
        return this.config.requestsPerMinute;
    }
  }

  /** Drop expired windows so the map cannot grow unbounded. */
  private prune(now: number): void {
    if (now - this.lastPrunedAt < 60_000) {
      return;
    }
    this.lastPrunedAt = now;
    for (const [key, window] of this.windows) {
      if (now >= window.resetAt) {
        this.windows.delete(key);
      }
    }
  }
}
