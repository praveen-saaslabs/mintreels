/**
 * Owner filter shared by the ownership-rooted repositories (project, recording,
 * clip). Exactly one field is non-null — mirrors the projects.user_id XOR
 * guest_id invariant. Structurally compatible with the API's Ownership type.
 */
export interface OwnerFilter {
  userId: number | null;
  guestId: string | null;
}

/** Project-level where fragment selecting rows for the given owner. */
export function ownerWhere(owner: OwnerFilter): { userId: number } | { guestId: string } {
  return owner.userId != null ? { userId: owner.userId } : { guestId: owner.guestId as string };
}
