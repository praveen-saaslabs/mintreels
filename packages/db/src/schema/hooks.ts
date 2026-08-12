import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { recordings } from './recordings';

export const hooks = pgTable('hooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id')
    .notNull()
    .references(() => recordings.id),
  title: text('title').notNull(),
  rationale: text('rationale').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  score: integer('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
