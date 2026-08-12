import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { recordings } from './recordings';
import { hooks } from './hooks';

export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id')
    .notNull()
    .references(() => recordings.id),
  hookId: uuid('hook_id').references(() => hooks.id),
  title: text('title').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  storageKey: text('storage_key'),
  status: text('status').notNull(),
  burnSubtitles: boolean('burn_subtitles').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
