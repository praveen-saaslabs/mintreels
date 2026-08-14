import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipFitMode1700000000008 implements MigrationInterface {
  name = 'ClipFitMode1700000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clips\` ADD \`fit_mode\` VARCHAR(16) NOT NULL DEFAULT 'fit'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`fit_mode\``);
  }
}
