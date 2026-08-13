import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Hook,
  HookRepository,
  Job,
  JobAuditLog,
  JobAuditLogRepository,
  JobRepository,
  JobStep,
  JobStepRepository,
  Recording,
  RecordingRepository,
  Transcript,
  TranscriptRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { ClipsModule } from '../clips/clips.module';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hook, Recording, Transcript, Job, JobStep, JobAuditLog]),
    AuthModule,
    ClipsModule,
  ],
  controllers: [HooksController],
  providers: [
    HooksService,
    HookRepository,
    RecordingRepository,
    TranscriptRepository,
    JobRepository,
    JobStepRepository,
    JobAuditLogRepository,
  ],
  exports: [HooksService],
})
export class HooksModule {}
