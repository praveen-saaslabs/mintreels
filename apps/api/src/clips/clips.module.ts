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
import { GuestModule } from '../guest/guest.module';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Clip, Recording, Hook, Job, JobAuditLog]), GuestModule],
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
