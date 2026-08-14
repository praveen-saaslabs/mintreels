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

/** Reels-oriented hook dimensions: controversy + headline (scroll-stop) scores. */
export class HookHeadlineScores1700000000007 implements MigrationInterface {
  name = 'HookHeadlineScores1700000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await addColumn(queryRunner, 'hooks', 'controversy_score', 'DOUBLE NULL');
    await addColumn(queryRunner, 'hooks', 'headline_score', 'DOUBLE NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['headline_score', 'controversy_score']) {
      if (await hasColumn(queryRunner, 'hooks', column)) {
        await queryRunner.query(`ALTER TABLE \`hooks\` DROP COLUMN \`${column}\``);
      }
    }
  }
}
