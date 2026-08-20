import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove email verification system completely.
 * Drops email_verified, email_verification_code_hash, and email_verification_expires_at columns.
 */
export class RemoveEmailVerification1700000000013 implements MigrationInterface {
  name = 'RemoveEmailVerification1700000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_expires_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_code_hash\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verified\``,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verified\` TINYINT(1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verification_code_hash\` VARCHAR(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`email_verification_expires_at\` DATETIME NULL`,
    );
  }
}