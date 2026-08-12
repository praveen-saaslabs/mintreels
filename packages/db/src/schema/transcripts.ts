import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { recordings } from './recordings';

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id')
    .notNull()
    .references(() => recordings.id),
  language: text('language'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transcriptSegments = pgTable('transcript_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transcriptId: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id),
  sequence: integer('sequence').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  speaker: text('speaker'),
  text: text('text').notNull(),
});
