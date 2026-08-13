import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema. Creates every table that maps to an entity in @mintreels/db.
 * All future schema changes go through new migration files, never entity sync.
 */
export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`email\` TEXT NOT NULL,
        \`name\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`projects\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` TEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`recordings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`project_id\` INT NOT NULL,
        \`title\` TEXT NOT NULL,
        \`original_filename\` TEXT NOT NULL,
        \`storage_key\` TEXT NOT NULL,
        \`duration_ms\` INT NULL,
        \`width\` INT NULL,
        \`height\` INT NULL,
        \`status\` TEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`transcripts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`recording_id\` INT NOT NULL,
        \`language\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`transcript_segments\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`recording_id\` INT NOT NULL,
        \`sequence\` INT NOT NULL,
        \`start_ms\` INT NOT NULL,
        \`end_ms\` INT NOT NULL,
        \`speaker\` TEXT NULL,
        \`text\` TEXT NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`summaries\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`recording_id\` INT NOT NULL,
        \`text\` TEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`knowledge_bases\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`project_id\` INT NOT NULL,
        \`name\` TEXT NOT NULL,
        \`scope\` TEXT NOT NULL,
        \`provider\` TEXT NOT NULL,
        \`provider_knowledge_base_id\` TEXT NOT NULL,
        \`recording_id\` INT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`knowledge_documents\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`knowledge_base_id\` INT NOT NULL,
        \`provider_document_id\` TEXT NOT NULL,
        \`recording_id\` INT NULL,
        \`source_type\` TEXT NOT NULL,
        \`title\` TEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`hooks\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`recording_id\` INT NOT NULL,
        \`title\` TEXT NOT NULL,
        \`hook\` TEXT NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`start_ms\` INT NOT NULL,
        \`end_ms\` INT NOT NULL,
        \`score\` DOUBLE NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`clips\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`recording_id\` INT NOT NULL,
        \`hook_id\` INT NULL,
        \`title\` TEXT NOT NULL,
        \`start_ms\` INT NOT NULL,
        \`end_ms\` INT NOT NULL,
        \`subtitle_style\` TEXT NULL,
        \`storage_key\` TEXT NULL,
        \`status\` TEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`jobs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`type\` TEXT NOT NULL,
        \`recording_id\` INT NULL,
        \`status\` TEXT NOT NULL,
        \`attempt\` INT NOT NULL DEFAULT 0,
        \`max_attempts\` INT NOT NULL DEFAULT 3,
        \`error\` TEXT NULL,
        \`started_at\` DATETIME NULL,
        \`finished_at\` DATETIME NULL,
        \`metadata\` JSON NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`jobs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`clips\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`hooks\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`knowledge_documents\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`knowledge_bases\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`summaries\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transcript_segments\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transcripts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`recordings\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`projects\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
