import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Summary, SummaryRepository } from '@mintreels/db';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Summary])],
  controllers: [SummariesController],
  providers: [SummariesService, SummaryRepository],
  exports: [SummariesService],
})
export class SummariesModule {}
