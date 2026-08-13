import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Clip,
  ClipRepository,
  Hook,
  HookRepository,
  Job,
  JobAuditLog,
  JobAuditLogRepository,
  JobRepository,
  Recording,
  RecordingRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Clip, Recording, Hook, Job, JobAuditLog]), AuthModule],
  controllers: [ClipsController],
  providers: [
    ClipsService,
    ClipRepository,
    RecordingRepository,
    HookRepository,
    JobRepository,
    JobAuditLogRepository,
  ],
  exports: [ClipsService, ClipRepository],
})
export class ClipsModule {}
