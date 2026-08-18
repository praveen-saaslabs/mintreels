import 'reflect-metadata';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDataSource } from '@mintreels/db';
import {
  loadDotEnv,
  migrationsMissingMessage,
  requireEnv,
  tableExists,
  truncateProductTables,
} from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

async function reset(): Promise<void> {
  loadDotEnv(join(root, '.env'));
  requireEnv('DATABASE_URL');

  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    if (!(await tableExists(dataSource, 'users'))) {
      throw new Error(migrationsMissingMessage);
    }
    await truncateProductTables(dataSource);
    console.log('Reset product tables. Migrations were not changed.');
  } finally {
    await dataSource.destroy();
  }
}

try {
  await reset();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error('Reset failed.');
  }
  process.exitCode = 1;
}
