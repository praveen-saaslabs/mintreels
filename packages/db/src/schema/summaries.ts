import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { recordings } from './recordings';

export const summaries = pgTable('summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id')
    .notNull()
    .references(() => recordings.id),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
