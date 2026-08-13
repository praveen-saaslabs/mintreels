import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Summary, SummaryRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Summary]), AuthModule],
  controllers: [SummariesController],
  providers: [SummariesService, SummaryRepository],
  exports: [SummariesService],
})
export class SummariesModule {}
