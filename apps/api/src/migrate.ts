import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDataSource } from './data-source';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'migrations');

function nextSequence(): number {
  const files = readdirSync(migrationsDir).filter((f) => /^\d{4}-/.test(f));
  const max = files.reduce((acc, f) => Math.max(acc, Number.parseInt(f.slice(0, 4), 10)), 0);
  return max + 1;
}

function className(name: string): string {
  const pascal = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return pascal || 'Migration';
}

function createMigration(name: string): void {
  const seq = nextSequence();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${String(seq).padStart(4, '0')}-${slug || 'migration'}.ts`;
  const filePath = join(migrationsDir, fileName);
  // TypeORM requires the migration name to end with a 13-digit JS timestamp;
  // it parses the last 13 chars and sorts migrations by that timestamp.
  const timestamp = Date.now();
  const cls = `${className(name)}${timestamp}`;

  const skeleton = `import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ${cls} implements MigrationInterface {
  name = '${cls}';

  async up(_queryRunner: QueryRunner): Promise<void> {
    // TODO: implement schema change
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // TODO: reverse the schema change
  }
}
`;

  writeFileSync(filePath, skeleton, 'utf8');

  const indexPath = join(migrationsDir, 'index.ts');
  const current = `import { ${cls} } from './${fileName.replace(/\.ts$/, '')}';\n`;
  writeFileSync(indexPath, current, { flag: 'a' });
  // Append to the migrations array. We re-read and patch to keep ordering intact.
  let indexSrc = readFileSync(indexPath, 'utf8');
  indexSrc = indexSrc.replace(
    /export const migrations = \[([^\]]*)\];/,
    (_m, inner: string) => {
      const items = inner.split(',').map((s) => s.trim()).filter(Boolean);
      items.push(cls);
      return `export const migrations = [${items.join(', ')}];`;
    },
  );
  writeFileSync(indexPath, indexSrc, 'utf8');

  console.log(`Created ${filePath} and registered ${cls} in index.ts`);
}

async function showMigrations(): Promise<void> {
  const pending = await appDataSource.showMigrations();
  console.log(pending ? 'There are pending migrations.' : 'No pending migrations.');
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  if (cmd === 'create') {
    const name = rest[0];
    if (!name) {
      console.error('Usage: tsx src/migrate.ts create <Name>');
      process.exitCode = 1;
      return;
    }
    createMigration(name);
    return;
  }

  await appDataSource.initialize();
  try {
    if (cmd === 'run') {
      await appDataSource.runMigrations({ transaction: 'each' });
      console.log('Migrations applied.');
    } else if (cmd === 'revert') {
      await appDataSource.undoLastMigration({ transaction: 'each' });
      console.log('Last migration reverted.');
    } else if (cmd === 'show') {
      await showMigrations();
    } else {
      console.error('Usage: tsx src/migrate.ts <run|revert|show|create <Name>>');
      process.exitCode = 1;
    }
  } finally {
    await appDataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
