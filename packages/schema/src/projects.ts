import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';

/**
 * projects — listed in docs/architecture.md §15 (columns not fully specified;
 * container for recordings and knowledge bases).
 */
export const projectRowSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    name: z.string().min(1),
  })
  .merge(timestampsSchema);

export const projectInsertSchema = projectRowSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProjectRow = z.infer<typeof projectRowSchema>;
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
