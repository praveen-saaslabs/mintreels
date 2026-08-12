import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  storageKey: text('storage_key').notNull(),
  durationMs: integer('duration_ms'),
  status: text('status').notNull(),
  knowledgeBaseId: uuid('knowledge_base_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
