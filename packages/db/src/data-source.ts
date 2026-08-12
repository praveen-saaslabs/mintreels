import 'reflect-metadata';
import { DataSource } from 'typeorm';
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

export function createDataSourceOptions(url = requireDatabaseUrl()) {
  return {
    type: 'mysql' as const,
    url,
    entities: [...entities],
    synchronize: false,
    logging: false,
  };
}

export function createDataSource(url = requireDatabaseUrl()) {
  return new DataSource(createDataSourceOptions(url));
}

export type AppDataSource = DataSource;
