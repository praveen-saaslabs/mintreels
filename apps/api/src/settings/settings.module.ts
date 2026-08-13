import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, JobRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService, JobRepository],
})
export class SettingsModule {}
