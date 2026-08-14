import { z } from 'zod';
import { deletedAtSchema, idSchema, timestampsSchema } from './common';

/**
 * projects — listed in docs/architecture.md §15 (columns not fully specified;
 * container for recordings and knowledge bases).
 */
export const projectRowSchema = z
  .object({
    id: idSchema,
    // Exactly one owner is set (user_id XOR guest_id). guestId is an opaque token.
    userId: idSchema.nullable(),
    guestId: z.string().min(1).nullable(),
    name: z.string().min(1),
  })
  .merge(timestampsSchema)
  .merge(deletedAtSchema);

export const projectInsertSchema = projectRowSchema.partial({
  id: true,
  userId: true,
  guestId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type ProjectRow = z.infer<typeof projectRowSchema>;
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
