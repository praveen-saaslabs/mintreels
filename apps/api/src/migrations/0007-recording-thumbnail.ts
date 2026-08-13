import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordingThumbnail1700000000006 implements MigrationInterface {
  name = 'RecordingThumbnail1700000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`recordings\` ADD \`thumbnail_storage_key\` TEXT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`thumbnail_storage_key\``);
  }
}
