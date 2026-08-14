import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Job,
  JobRepository,
  JobStep,
  JobStepRepository,
  Recording,
  RecordingRepository,
  Transcript,
  TranscriptRepository,
  TranscriptSegment,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { GuestModule } from '../guest/guest.module';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording, Transcript, TranscriptSegment, Job, JobStep]),
    GuestModule,
  ],
  controllers: [MomentsController],
  providers: [
    MomentsService,
    RecordingRepository,
    TranscriptRepository,
    TranscriptSegmentRepository,
    JobRepository,
    JobStepRepository,
  ],
})
export class MomentsModule {}
