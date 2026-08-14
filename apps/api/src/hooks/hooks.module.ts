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
import { GuestModule } from '../guest/guest.module';
import { ClipsModule } from '../clips/clips.module';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hook, Recording, Transcript, Job, JobStep, JobAuditLog]),
    GuestModule,
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
