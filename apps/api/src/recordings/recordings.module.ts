import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording, RecordingRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording]), AuthModule],
  controllers: [RecordingsController],
  providers: [RecordingsService, RecordingRepository],
  exports: [RecordingsService],
})
export class RecordingsModule {}
