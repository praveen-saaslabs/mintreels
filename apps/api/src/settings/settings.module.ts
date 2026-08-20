import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, JobRepository, SystemSettings, SystemSettingsRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, SystemSettings]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService, JobRepository, SystemSettingsRepository],
})
export class SettingsModule {}
