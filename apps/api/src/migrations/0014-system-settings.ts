import type { MigrationInterface, QueryRunner } from 'typeorm';

/** System settings table for storing global configuration values like hook weights. */
export class SystemSettings1700000000014 implements MigrationInterface {
  name = 'SystemSettings1700000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`system_settings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`setting_key\` VARCHAR(64) NOT NULL UNIQUE,
        \`setting_value\` JSON NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`system_settings_key_unique\` (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Insert default hook weights setting
    await queryRunner.query(`
      INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`, \`description\`)
      VALUES (
        'hook_weights',
        JSON_OBJECT(
          'quality', 0.22,
          'standalone', 0.15,
          'curiosity', 0.12,
          'emotional', 0.08,
          'specificity', 0.08,
          'shareability', 0.08,
          'novelty', 0.04,
          'controversy', 0.12,
          'headline', 0.11
        ),
        'Hook scoring dimension weights for content analysis'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`system_settings\``);
  }
}
