export interface RequestUser {
  id: number;
}

/**
 * The resolved principal for a request: either an authenticated user or a
 * guest (anonymous sandbox) session. Resolved by IdentityGuard, read via
 * the @CurrentActor() decorator.
 */
export type RequestActor =
  | { type: 'user'; userId: number }
  | { type: 'guest'; guestId: string };

/**
 * Owner filter for repositories/services. Exactly one field is non-null
 * (mirrors the projects.user_id XOR guest_id invariant).
 */
export interface Ownership {
  userId: number | null;
  guestId: string | null;
}

export function ownership(actor: RequestActor): Ownership {
  return actor.type === 'user'
    ? { userId: actor.userId, guestId: null }
    : { userId: null, guestId: actor.guestId };
}
