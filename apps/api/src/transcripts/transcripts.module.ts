import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Recording,
  RecordingRepository,
  Transcript,
  TranscriptSegment,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transcript, TranscriptSegment, Recording]), AuthModule],
  controllers: [TranscriptsController],
  providers: [
    TranscriptsService,
    TranscriptRepository,
    TranscriptSegmentRepository,
    RecordingRepository,
  ],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
