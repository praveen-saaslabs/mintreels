import { createHash } from 'node:crypto';

/**
 * Canonical hash for guest cookie tokens. The raw high-entropy token lives only
 * in the cookie; we persist and look up sessions by this hash (guest_sessions.token_hash).
 * Both GuestSessionService and GuestClaimService must hash identically — hence one helper.
 */
export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
