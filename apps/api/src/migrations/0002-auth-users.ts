import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth user columns: unique email, password hash, email verification.
 * Assumes an empty users table (NOT NULL password_hash on existing rows).
 */
export class AuthUsers1700000000001 implements MigrationInterface {
  name = 'AuthUsers1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`email\` VARCHAR(255) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`users_email_unique\` ON \`users\` (\`email\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`password_hash\` VARCHAR(255) NOT NULL`,
    );
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

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_expires_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verification_code_hash\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`email_verified\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`password_hash\``,
    );
    await queryRunner.query(`DROP INDEX \`users_email_unique\` ON \`users\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`email\` TEXT NOT NULL`,
    );
  }
}
