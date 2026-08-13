import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project ownership: recordings are scoped through projects.user_id.
 * Assumes an empty projects table (NOT NULL user_id).
 */
export class ProjectOwner1700000000002 implements MigrationInterface {
  name = 'ProjectOwner1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`projects\` ADD \`user_id\` INT NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX \`projects_user_id_idx\` ON \`projects\` (\`user_id\`)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`projects_user_id_idx\` ON \`projects\``);
    await queryRunner.query(`ALTER TABLE \`projects\` DROP COLUMN \`user_id\``);
  }
}
