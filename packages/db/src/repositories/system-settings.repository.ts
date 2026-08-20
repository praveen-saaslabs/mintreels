import type { SettingKey, SystemSettingsUpdate } from '@mintreels/schema';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SystemSettings } from '../entities/system-settings.entity';

@Injectable()
export class SystemSettingsRepository extends Repository<SystemSettings> {
  constructor(dataSource: DataSource) {
    super(SystemSettings, dataSource.createEntityManager());
  }

  async findByKey(key: SettingKey): Promise<SystemSettings | null> {
    return this.findOneBy({ settingKey: key });
  }

  async upsertSetting(
    key: SettingKey,
    value: Record<string, any>,
    description?: string,
  ): Promise<SystemSettings> {
    const existing = await this.findByKey(key);

    if (existing) {
      existing.settingValue = value;
      if (description !== undefined) {
        existing.description = description;
      }
      return this.save(existing);
    } else {
      const newSetting = this.create({
        settingKey: key,
        settingValue: value,
        description: description || null,
      });
      return this.save(newSetting);
    }
  }

  async updateSetting(
    key: SettingKey,
    update: SystemSettingsUpdate,
  ): Promise<SystemSettings | null> {
    const existing = await this.findByKey(key);
    if (!existing) {
      return null;
    }

    if (update.settingValue !== undefined) {
      existing.settingValue = update.settingValue;
    }
    if (update.description !== undefined) {
      existing.description = update.description;
    }

    return this.save(existing);
  }

  async deleteSetting(key: SettingKey): Promise<boolean> {
    const result = await this.delete({ settingKey: key });
    return result.affected > 0;
  }

  async listAll(): Promise<SystemSettings[]> {
    return this.find();
  }
}
