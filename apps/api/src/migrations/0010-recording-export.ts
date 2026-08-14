import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordingExport1700000000009 implements MigrationInterface {
  name = 'RecordingExport1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`recordings\` ADD \`export_storage_key\` TEXT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`recordings\` ADD \`export_thumbnail_storage_key\` TEXT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`recordings\` ADD \`export_status\` TEXT NULL`);
    await queryRunner.query(
      `ALTER TABLE \`recordings\` ADD \`export_aspect_ratio\` VARCHAR(16) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`recordings\` ADD \`export_fit_mode\` VARCHAR(16) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`recordings\` ADD \`export_burn_subtitles\` TINYINT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`recordings\` DROP COLUMN \`export_burn_subtitles\``,
    );
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`export_fit_mode\``);
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`export_aspect_ratio\``);
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`export_status\``);
    await queryRunner.query(
      `ALTER TABLE \`recordings\` DROP COLUMN \`export_thumbnail_storage_key\``,
    );
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`export_storage_key\``);
  }
}
