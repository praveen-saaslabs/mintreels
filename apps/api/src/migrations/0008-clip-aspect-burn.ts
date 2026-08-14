import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipAspectBurn1700000000007 implements MigrationInterface {
  name = 'ClipAspectBurn1700000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clips\` ADD \`aspect_ratio\` VARCHAR(16) NOT NULL DEFAULT '9:16'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clips\` ADD \`burn_subtitles\` TINYINT(1) NOT NULL DEFAULT 1`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`burn_subtitles\``);
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`aspect_ratio\``);
  }
}
