import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipVoiceover1700000000011 implements MigrationInterface {
  name = 'ClipVoiceover1700000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` ADD \`voiceover\` JSON NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`voiceover\``);
  }
}
