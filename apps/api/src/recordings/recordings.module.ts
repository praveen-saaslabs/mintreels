import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording, RecordingRepository } from '@mintreels/db';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording])],
  controllers: [RecordingsController],
  providers: [RecordingsService, RecordingRepository],
  exports: [RecordingsService],
})
export class RecordingsModule {}
