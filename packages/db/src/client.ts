import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}

export function createDb(connectionString = requireDatabaseUrl()) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
