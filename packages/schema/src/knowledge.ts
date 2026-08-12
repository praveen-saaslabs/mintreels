import { z } from 'zod';
import { idSchema, timestampsSchema } from './common';

/**
 * knowledge_bases / knowledge_documents — docs/architecture.md §12
 *
 * scope: recording | global
 * Postgres stores provider metadata IDs only (no embeddings).
 */
export const knowledgeBaseScopeSchema = z.enum(['recording', 'global']);

export const knowledgeBaseRowSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    name: z.string().min(1),
    scope: knowledgeBaseScopeSchema,
    provider: z.string().min(1),
    providerKnowledgeBaseId: z.string().min(1),
    recordingId: idSchema.nullable(),
  })
  .merge(timestampsSchema);

export const knowledgeBaseInsertSchema = knowledgeBaseRowSchema.partial({
  id: true,
  recordingId: true,
  createdAt: true,
  updatedAt: true,
});

export const knowledgeDocumentRowSchema = z.object({
  id: idSchema,
  knowledgeBaseId: idSchema,
  providerDocumentId: z.string().min(1),
  recordingId: idSchema.nullable(),
  sourceType: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.coerce.date(),
});

export const knowledgeDocumentInsertSchema = knowledgeDocumentRowSchema.partial({
  id: true,
  recordingId: true,
  createdAt: true,
});

export type KnowledgeBaseScope = z.infer<typeof knowledgeBaseScopeSchema>;
export type KnowledgeBaseRow = z.infer<typeof knowledgeBaseRowSchema>;
export type KnowledgeBaseInsert = z.infer<typeof knowledgeBaseInsertSchema>;
export type KnowledgeDocumentRow = z.infer<typeof knowledgeDocumentRowSchema>;
export type KnowledgeDocumentInsert = z.infer<typeof knowledgeDocumentInsertSchema>;
