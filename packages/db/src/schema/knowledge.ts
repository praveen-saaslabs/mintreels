import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { recordings } from './recordings';

export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  scope: text('scope').notNull(),
  provider: text('provider').notNull(),
  providerKnowledgeBaseId: text('provider_knowledge_base_id').notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id')
    .notNull()
    .references(() => knowledgeBases.id),
  providerDocumentId: text('provider_document_id').notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
