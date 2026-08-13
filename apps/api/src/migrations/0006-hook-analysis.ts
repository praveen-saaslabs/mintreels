import type { MigrationInterface, QueryRunner } from 'typeorm';

type CountRow = { cnt: string | number };

async function hasColumn(
  queryRunner: QueryRunner,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )) as CountRow[];
  return Number(rows[0]?.cnt) > 0;
}

async function hasIndex(
  queryRunner: QueryRunner,
  table: string,
  indexName: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName],
  )) as CountRow[];
  return Number(rows[0]?.cnt) > 0;
}

async function addColumn(
  queryRunner: QueryRunner,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(queryRunner, table, column)) {
    return;
  }
  await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`${column}\` ${definition}`);
}

/**
 * Hook analysis: segment refs, type, dimension scores, embedding/clip status.
 *
 * ponytail: MySQL DDL auto-commits, so a crashed `up()` can leave columns without a
 * migrations row. Adds/indexes are idempotent; upgrade path is a normal down()+up().
 */
export class HookAnalysis1700000000005 implements MigrationInterface {
  name = 'HookAnalysis1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await addColumn(queryRunner, 'hooks', 'start_segment_id', 'INT NULL');
    await addColumn(queryRunner, 'hooks', 'end_segment_id', 'INT NULL');
    await addColumn(queryRunner, 'hooks', 'hook_type', 'TEXT NULL');
    await addColumn(queryRunner, 'hooks', 'context_text', 'TEXT NULL');
    await addColumn(queryRunner, 'hooks', 'quality_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'standalone_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'curiosity_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'emotional_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'specificity_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'shareability_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'novelty_score', 'DOUBLE NULL');
    await addColumn(
      queryRunner,
      'hooks',
      'status',
      `VARCHAR(32) NOT NULL DEFAULT 'candidate'`,
    );
    await addColumn(
      queryRunner,
      'hooks',
      'embedding_status',
      `VARCHAR(32) NOT NULL DEFAULT 'pending'`,
    );
    await addColumn(queryRunner, 'hooks', 'clip_start_ms', 'INT NULL');
    await addColumn(queryRunner, 'hooks', 'clip_end_ms', 'INT NULL');
    await addColumn(queryRunner, 'hooks', 'provider', 'TEXT NULL');
    await addColumn(queryRunner, 'hooks', 'model', 'TEXT NULL');
    await addColumn(queryRunner, 'hooks', 'prompt_version', 'TEXT NULL');

    if (!(await hasIndex(queryRunner, 'hooks', 'hooks_recording_start_idx'))) {
      await queryRunner.query(
        `CREATE INDEX \`hooks_recording_start_idx\` ON \`hooks\` (\`recording_id\`, \`start_ms\`)`,
      );
    }
    if (!(await hasIndex(queryRunner, 'hooks', 'hooks_recording_status_idx'))) {
      await queryRunner.query(
        `CREATE INDEX \`hooks_recording_status_idx\` ON \`hooks\` (\`recording_id\`, \`status\`)`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await hasIndex(queryRunner, 'hooks', 'hooks_recording_status_idx')) {
      await queryRunner.query(`DROP INDEX \`hooks_recording_status_idx\` ON \`hooks\``);
    }
    if (await hasIndex(queryRunner, 'hooks', 'hooks_recording_start_idx')) {
      await queryRunner.query(`DROP INDEX \`hooks_recording_start_idx\` ON \`hooks\``);
    }
    for (const column of [
      'prompt_version',
      'model',
      'provider',
      'clip_end_ms',
      'clip_start_ms',
      'embedding_status',
      'status',
      'novelty_score',
      'shareability_score',
      'specificity_score',
      'emotional_score',
      'curiosity_score',
      'standalone_score',
      'quality_score',
      'context_text',
      'hook_type',
      'end_segment_id',
      'start_segment_id',
    ]) {
      if (await hasColumn(queryRunner, 'hooks', column)) {
        await queryRunner.query(`ALTER TABLE \`hooks\` DROP COLUMN \`${column}\``);
      }
    }
  }
}
