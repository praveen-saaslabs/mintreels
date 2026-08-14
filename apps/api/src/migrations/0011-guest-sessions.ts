import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Guest sessions + guest project ownership.
 * - New guest_sessions table (opaque guest_id, hashed cookie token).
 * - projects.user_id becomes nullable; adds nullable guest_id.
 * - Owner XOR invariant: exactly one of user_id / guest_id is set.
 */
export class GuestSessions1700000000010 implements MigrationInterface {
  name = 'GuestSessions1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`guest_sessions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`guest_id\` VARCHAR(255) NOT NULL,
        \`token_hash\` VARCHAR(255) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
        \`user_id\` INT NULL,
        \`expires_at\` DATETIME NOT NULL,
        \`last_seen_at\` DATETIME NOT NULL,
        \`claimed_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`guest_sessions_guest_id_idx\` (\`guest_id\`),
        UNIQUE INDEX \`guest_sessions_token_hash_idx\` (\`token_hash\`),
        INDEX \`guest_sessions_expires_at_idx\` (\`expires_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(`ALTER TABLE \`projects\` MODIFY \`user_id\` INT NULL`);
    await queryRunner.query(`ALTER TABLE \`projects\` ADD \`guest_id\` VARCHAR(255) NULL`);
    await queryRunner.query(
      `CREATE INDEX \`projects_guest_id_idx\` ON \`projects\` (\`guest_id\`)`,
    );
    // Exactly one owner (MySQL 8.0.16+ enforces CHECK). Also enforced in the service layer.
    await queryRunner.query(
      `ALTER TABLE \`projects\` ADD CONSTRAINT \`projects_owner_xor\` ` +
        `CHECK ((\`user_id\` IS NULL) <> (\`guest_id\` IS NULL))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`projects\` DROP CONSTRAINT \`projects_owner_xor\``);
    await queryRunner.query(`DROP INDEX \`projects_guest_id_idx\` ON \`projects\``);
    await queryRunner.query(`ALTER TABLE \`projects\` DROP COLUMN \`guest_id\``);
    await queryRunner.query(`ALTER TABLE \`projects\` MODIFY \`user_id\` INT NOT NULL`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`guest_sessions\``);
  }
}
