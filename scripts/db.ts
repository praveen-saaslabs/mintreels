import { existsSync, readFileSync } from 'node:fs';

export type DbClient = {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
};

const truncateOrder = [
  'job_audit_logs',
  'job_steps',
  'jobs',
  'knowledge_documents',
  'knowledge_bases',
  'clips',
  'hooks',
  'summaries',
  'transcripts',
  'transcript_segments',
  'recordings',
  'projects',
  'guest_sessions',
  'users',
] as const;

export const migrationsMissingMessage =
  'Database has no users table. Start the API so TypeORM migrations run, then retry.';

export function loadDotEnv(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and set it (value is not printed).`);
  }
  return value;
}

export async function tableExists(dataSource: DbClient, table: string): Promise<boolean> {
  const rows = (await dataSource.query(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [table],
  )) as Array<{ ok: number }>;
  return rows.length > 0;
}

export async function truncateProductTables(dataSource: DbClient): Promise<void> {
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of truncateOrder) {
      if (await tableExists(dataSource, table)) {
        await dataSource.query(`TRUNCATE TABLE \`${table}\``);
      }
    }
  } finally {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
