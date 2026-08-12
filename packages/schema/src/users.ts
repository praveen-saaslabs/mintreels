import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';

/**
 * users — listed in docs/architecture.md §15 (columns not fully specified;
 * minimal identity fields for project ownership).
 */
export const userRowSchema = z
  .object({
    id: idSchema,
    email: z.string().email(),
    name: z.string().nullable(),
  })
  .merge(timestampsSchema);

export const userInsertSchema = userRowSchema.partial({
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
});

export type UserRow = z.infer<typeof userRowSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;
