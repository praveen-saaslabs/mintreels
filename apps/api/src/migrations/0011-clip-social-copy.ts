import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipSocialCopy1700000000010 implements MigrationInterface {
  name = 'ClipSocialCopy1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clips\` ADD \`social_title\` VARCHAR(120) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clips\` ADD \`social_description\` TEXT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`social_description\``);
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`social_title\``);
  }
}
