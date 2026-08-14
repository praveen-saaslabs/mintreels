import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording, RecordingRepository, Summary, SummaryRepository } from '@mintreels/db';
import { GuestModule } from '../guest/guest.module';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Summary, Recording]), GuestModule],
  controllers: [SummariesController],
  providers: [SummariesService, SummaryRepository, RecordingRepository],
  exports: [SummariesService],
})
export class SummariesModule {}
