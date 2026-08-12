import { knowledgeBaseInsertSchema } from '@mintreels/schema';
import { z } from 'zod';

/** Client request body for POST /api/knowledge-bases. */
export const createKnowledgeBaseRequestSchema = knowledgeBaseInsertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateKnowledgeBaseRequest = z.infer<typeof createKnowledgeBaseRequestSchema>;
