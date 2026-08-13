import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Transcript,
  TranscriptSegment,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transcript, TranscriptSegment]), AuthModule],
  controllers: [TranscriptsController],
  providers: [TranscriptsService, TranscriptRepository, TranscriptSegmentRepository],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
