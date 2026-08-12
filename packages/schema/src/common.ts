import { z } from 'zod';

/** Shared timestamp fields used across architecture tables. */
export const timestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const idSchema = z.number().int().positive();
