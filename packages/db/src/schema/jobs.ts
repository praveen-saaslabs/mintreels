import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  payload: jsonb('payload').notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
