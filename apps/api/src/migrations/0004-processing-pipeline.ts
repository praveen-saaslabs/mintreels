import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Media-processing pipeline: audio key, job step/audit tables, transcript + summary extras.
 */
export class ProcessingPipeline1700000000003 implements MigrationInterface {
  name = 'ProcessingPipeline1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`recordings\` ADD \`audio_storage_key\` TEXT NULL`);

    await queryRunner.query(`ALTER TABLE \`jobs\` MODIFY \`max_attempts\` INT NOT NULL DEFAULT 4`);
    await queryRunner.query(`ALTER TABLE \`jobs\` ADD \`current_step\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`jobs\` ADD \`error_code\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`jobs\` ADD \`error_metadata\` JSON NULL`);
    await queryRunner.query(
      `ALTER TABLE \`jobs\` ADD \`updated_at\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    );

    await queryRunner.query(
      `CREATE TABLE \`job_steps\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`job_id\` INT NOT NULL,
        \`step\` TEXT NOT NULL,
        \`status\` TEXT NOT NULL,
        \`attempt\` INT NOT NULL DEFAULT 0,
        \`max_attempts\` INT NOT NULL DEFAULT 4,
        \`provider\` TEXT NULL,
        \`provider_job_id\` TEXT NULL,
        \`idempotency_key\` TEXT NOT NULL,
        \`result\` JSON NULL,
        \`error\` JSON NULL,
        \`started_at\` DATETIME NULL,
        \`completed_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`job_steps_job_step_unique\` (\`job_id\`, \`step\`(64)),
        INDEX \`job_steps_job_id_idx\` (\`job_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`job_audit_logs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`job_id\` INT NOT NULL,
        \`step\` TEXT NULL,
        \`event\` TEXT NOT NULL,
        \`message\` TEXT NOT NULL,
        \`metadata\` JSON NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`job_audit_logs_job_created_idx\` (\`job_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`provider\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`provider_job_id\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`status\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`text\` TEXT NULL`);
    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`duration_ms\` INT NULL`);
    await queryRunner.query(`ALTER TABLE \`transcripts\` ADD \`raw_response\` JSON NULL`);

    await queryRunner.query(
      `CREATE INDEX \`transcript_segments_recording_start_idx\` ON \`transcript_segments\` (\`recording_id\`, \`start_ms\`)`,
    );

    await queryRunner.query(`ALTER TABLE \`summaries\` ADD \`action_items\` JSON NULL`);
    await queryRunner.query(`ALTER TABLE \`summaries\` ADD \`key_points\` JSON NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`summaries\` DROP COLUMN \`key_points\``);
    await queryRunner.query(`ALTER TABLE \`summaries\` DROP COLUMN \`action_items\``);
    await queryRunner.query(
      `DROP INDEX \`transcript_segments_recording_start_idx\` ON \`transcript_segments\``,
    );
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`raw_response\``);
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`duration_ms\``);
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`text\``);
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`status\``);
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`provider_job_id\``);
    await queryRunner.query(`ALTER TABLE \`transcripts\` DROP COLUMN \`provider\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`job_audit_logs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`job_steps\``);
    await queryRunner.query(`ALTER TABLE \`jobs\` DROP COLUMN \`updated_at\``);
    await queryRunner.query(`ALTER TABLE \`jobs\` DROP COLUMN \`error_metadata\``);
    await queryRunner.query(`ALTER TABLE \`jobs\` DROP COLUMN \`error_code\``);
    await queryRunner.query(`ALTER TABLE \`jobs\` DROP COLUMN \`current_step\``);
    await queryRunner.query(`ALTER TABLE \`jobs\` MODIFY \`max_attempts\` INT NOT NULL DEFAULT 3`);
    await queryRunner.query(`ALTER TABLE \`recordings\` DROP COLUMN \`audio_storage_key\``);
  }
}
