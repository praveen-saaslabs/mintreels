import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = [
  'users',
  'projects',
  'recordings',
  'transcripts',
  'transcript_segments',
  'summaries',
  'hooks',
  'clips',
  'jobs',
  'job_steps',
  'job_audit_logs',
  'knowledge_bases',
  'knowledge_documents',
] as const;

export class SoftDelete1700000000005 implements MigrationInterface {
  name = 'SoftDelete1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`deleted_at\` DATETIME NULL`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TABLES].reverse()) {
      await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`deleted_at\``);
    }
  }
}
