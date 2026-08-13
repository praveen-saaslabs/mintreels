import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipThumbnail1700000000004 implements MigrationInterface {
  name = 'ClipThumbnail1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` ADD \`thumbnail_storage_key\` TEXT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`thumbnail_storage_key\``);
  }
}
