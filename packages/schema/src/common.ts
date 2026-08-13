import { z } from 'zod';

/** Shared timestamp fields used across architecture tables. */
export const timestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Soft delete — null means active; set means hidden from lists/gets. */
export const deletedAtSchema = z.object({
  deletedAt: z.coerce.date().nullable(),
});

export const idSchema = z.number().int().positive();
