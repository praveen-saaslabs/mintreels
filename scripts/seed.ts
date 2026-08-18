import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDataSource } from '@mintreels/db';
import {
  loadDotEnv,
  migrationsMissingMessage,
  requireEnv,
  tableExists,
  truncateProductTables,
  type DbClient,
} from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const fixturePath = join(root, 'fixtures', 'seed.sql');
const demoEmail = 'demo@mintreels.io';

const seedTables = [
  'users',
  'projects',
  'recordings',
  'transcripts',
  'transcript_segments',
  'summaries',
  'hooks',
  'clips',
  'jobs',
  'job_steps',
  'job_audit_logs',
] as const;

function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      continue;
    }
    if (ch !== ';') {
      continue;
    }
    const stmt = sql.slice(start, i).trim();
    if (stmt !== '') {
      statements.push(stmt);
    }
    start = i + 1;
  }
  const tail = sql.slice(start).trim();
  if (tail !== '') {
    statements.push(tail);
  }
  return statements;
}

function redactSeedError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('password_hash') || message.includes('$argon2')) {
    return new Error('Seed SQL failed. The statement body is not printed.');
  }
  if (message.includes('Duplicate entry')) {
    return new Error(
      'Seed data collides with rows already in MySQL. Set SEED_FORCE=1 to truncate product tables and reload. Migrations are never truncated.',
    );
  }
  return error instanceof Error ? error : new Error(message);
}

async function demoUserExists(dataSource: DbClient): Promise<boolean> {
  const rows = (await dataSource.query(
    'SELECT `id` FROM `users` WHERE `email` = ? AND `deleted_at` IS NULL LIMIT 1',
    [demoEmail],
  )) as Array<{ id: number }>;
  return rows.length > 0;
}

async function resetAutoIncrements(dataSource: DbClient): Promise<void> {
  for (const table of seedTables) {
    const rows = (await dataSource.query(
      `SELECT COALESCE(MAX(\`id\`), 0) AS maxId FROM \`${table}\``,
    )) as Array<{ maxId: number | string }>;
    const maxId = Number(rows[0]?.maxId ?? 0);
    if (!Number.isFinite(maxId) || maxId < 0) {
      throw new Error(`Could not read MAX(id) for ${table}.`);
    }
    const next = Math.trunc(maxId) + 1;
    await dataSource.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${String(next)}`);
  }
}

async function runFixture(dataSource: DbClient): Promise<void> {
  if (!existsSync(fixturePath)) {
    throw new Error(`Seed fixture missing: ${fixturePath}`);
  }
  const statements = splitStatements(stripLineComments(readFileSync(fixturePath, 'utf8')));
  if (statements.length === 0) {
    throw new Error('Seed fixture has no SQL statements.');
  }
  try {
    for (const statement of statements) {
      await dataSource.query(statement);
    }
  } catch (error: unknown) {
    throw redactSeedError(error);
  }
}

async function seed(): Promise<void> {
  loadDotEnv(join(root, '.env'));
  requireEnv('DATABASE_URL');
  const force = process.env.SEED_FORCE?.trim() === '1';

  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    if (!(await tableExists(dataSource, 'users'))) {
      throw new Error(migrationsMissingMessage);
    }

    if (!force && (await demoUserExists(dataSource))) {
      console.log(`Demo data already present for ${demoEmail}; skipping. Set SEED_FORCE=1 to reload.`);
      return;
    }

    if (force) {
      await truncateProductTables(dataSource);
    }

    await runFixture(dataSource);
    await resetAutoIncrements(dataSource);
    console.log(`Seeded demo data for ${demoEmail}.`);
  } finally {
    await dataSource.destroy();
  }
}

try {
  await seed();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
}
