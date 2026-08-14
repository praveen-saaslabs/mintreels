import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';
import { GuestSessionStatus } from './enums';

/**
 * guest_sessions — anonymous/sandbox identity. The cookie holds an opaque
 * random secret; only its hash (tokenHash) is stored. guestId is the opaque
 * public identifier used as the ownership key on projects.
 */
export const guestSessionRowSchema = z
  .object({
    id: idSchema,
    guestId: z.string().min(1),
    tokenHash: z.string().min(1),
    status: z.enum([
      GuestSessionStatus.Active,
      GuestSessionStatus.Claimed,
      GuestSessionStatus.Expired,
      GuestSessionStatus.Revoked,
    ]),
    userId: idSchema.nullable(),
    expiresAt: z.coerce.date(),
    lastSeenAt: z.coerce.date(),
    claimedAt: z.coerce.date().nullable(),
  })
  .merge(timestampsSchema);

export const guestSessionInsertSchema = guestSessionRowSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GuestSessionRow = z.infer<typeof guestSessionRowSchema>;
export type GuestSessionInsert = z.infer<typeof guestSessionInsertSchema>;
