import 'reflect-metadata';
import { DataSource } from 'typeorm';
import type { MigrationInterface } from 'typeorm';
import {
  User,
  Project,
  Recording,
  Transcript,
  TranscriptSegment,
  Summary,
  KnowledgeBase,
  KnowledgeDocument,
  Hook,
  Clip,
  Job,
} from './entities';

// A migration is registered as a class (constructor), not an instance.
export type MigrationClass = new () => MigrationInterface;

export const entities = [
  User,
  Project,
  Recording,
  Transcript,
  TranscriptSegment,
  Summary,
  KnowledgeBase,
  KnowledgeDocument,
  Hook,
  Clip,
  Job,
] as const;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}

export function createDataSourceOptions(
  url = requireDatabaseUrl(),
  extra: {
    migrations?: MigrationClass[] | undefined;
    migrationsRun?: boolean | undefined;
    migrationsTransactionMode?: 'all' | 'each' | 'none' | undefined;
  } = {},
) {
  return {
    type: 'mysql' as const,
    url,
    entities: [...entities],
    synchronize: false,
    logging: false,
    migrations: extra.migrations ?? [],
    migrationsRun: extra.migrationsRun ?? false,
    migrationsTransactionMode: extra.migrationsTransactionMode ?? 'each',
  };
}

export function createDataSource(
  url = requireDatabaseUrl(),
  extra: {
    migrations?: MigrationClass[] | undefined;
    migrationsRun?: boolean | undefined;
    migrationsTransactionMode?: 'all' | 'each' | 'none' | undefined;
  } = {},
) {
  return new DataSource(createDataSourceOptions(url, extra));
}

export type AppDataSource = DataSource;
