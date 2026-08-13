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
  Project,
  ProjectRepository,
  Recording,
  RecordingRepository,
  Summary,
  SummaryRepository,
  Transcript,
  TranscriptRepository,
  TranscriptSegment,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Recording,
      Project,
      Job,
      JobStep,
      JobAuditLog,
      Transcript,
      TranscriptSegment,
      Summary,
      Hook,
    ]),
    AuthModule,
  ],
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    RecordingRepository,
    ProjectRepository,
    JobRepository,
    JobStepRepository,
    JobAuditLogRepository,
    TranscriptRepository,
    TranscriptSegmentRepository,
    SummaryRepository,
    HookRepository,
  ],
  exports: [RecordingsService],
})
export class RecordingsModule {}
