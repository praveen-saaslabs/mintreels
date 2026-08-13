import { z } from 'zod';

/** POST /api/recordings/:id/moments/search */
export const searchMomentsRequestSchema = z.object({
  query: z.string().trim().min(3).max(500),
  limit: z.number().int().positive().max(50).optional(),
});

export const momentCandidateSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  clipStartMs: z.number().int().nonnegative(),
  clipEndMs: z.number().int().nonnegative(),
  title: z.string().min(1),
  excerpt: z.string(),
  similarity: z.number(),
});

export const searchMomentsResponseSchema = z.object({
  moments: z.array(momentCandidateSchema),
});

export type SearchMomentsRequest = z.infer<typeof searchMomentsRequestSchema>;
export type MomentCandidate = z.infer<typeof momentCandidateSchema>;
export type SearchMomentsResponse = z.infer<typeof searchMomentsResponseSchema>;

/** POST /api/recordings/:id/moments/ask — transcript Q&A, clip search, or off-topic reject. */
export const askMomentsRequestSchema = searchMomentsRequestSchema;

export const askMomentsResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('answer'),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal('moments'),
    moments: z.array(momentCandidateSchema),
  }),
  z.object({
    kind: z.literal('reject'),
    text: z.string().min(1),
  }),
]);

export type AskMomentsRequest = z.infer<typeof askMomentsRequestSchema>;
export type AskMomentsResponse = z.infer<typeof askMomentsResponseSchema>;
