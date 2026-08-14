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
  Transcript,
  TranscriptRepository,
  TranscriptSegment,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestModule } from '../guest/guest.module';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clip,
      Recording,
      Hook,
      Job,
      JobAuditLog,
      Transcript,
      TranscriptSegment,
    ]),
    GuestModule,
  ],
  controllers: [ClipsController],
  providers: [
    ClipsService,
    ClipRepository,
    RecordingRepository,
    HookRepository,
    JobRepository,
    JobAuditLogRepository,
    TranscriptRepository,
    TranscriptSegmentRepository,
  ],
  exports: [ClipsService, ClipRepository],
})
export class ClipsModule {}
