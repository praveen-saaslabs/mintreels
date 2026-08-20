import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { SettingKey, SystemSettingsRow } from '@mintreels/schema';

@Entity({ name: 'system_settings' })
export class SystemSettings implements SystemSettingsRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 64, name: 'setting_key', unique: true })
  settingKey!: SettingKey;

  @Column({ type: 'json', name: 'setting_value' })
  settingValue!: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
