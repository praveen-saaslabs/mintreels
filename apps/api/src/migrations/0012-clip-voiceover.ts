import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClipVoiceover1700000000011 implements MigrationInterface {
  name = 'ClipVoiceover1700000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Renamed from ClipVoiceover1700000000007 — column may already exist on DBs
    // that ran the previous migration name.
    const hasColumn = await queryRunner.hasColumn('clips', 'voiceover');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE \`clips\` ADD \`voiceover\` JSON NULL`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('clips', 'voiceover');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE \`clips\` DROP COLUMN \`voiceover\``);
    }
  }
}
