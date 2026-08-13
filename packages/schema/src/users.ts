import { z } from 'zod';
import { deletedAtSchema, idSchema, timestampsSchema } from './common';

/**
 * users — listed in docs/architecture.md §15 (columns not fully specified;
 * minimal identity fields for project ownership).
 */
export const userRowSchema = z
  .object({
    id: idSchema,
    email: z.string().email(),
    name: z.string().nullable(),
    passwordHash: z.string().min(1),
    emailVerified: z.boolean(),
    emailVerificationCodeHash: z.string().nullable(),
    emailVerificationExpiresAt: z.coerce.date().nullable(),
  })
  .merge(timestampsSchema)
  .merge(deletedAtSchema);

export const userInsertSchema = userRowSchema.partial({
  id: true,
  name: true,
  emailVerified: true,
  emailVerificationCodeHash: true,
  emailVerificationExpiresAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const userPublicSchema = userRowSchema.pick({
  id: true,
  email: true,
  emailVerified: true,
});

export type UserRow = z.infer<typeof userRowSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
