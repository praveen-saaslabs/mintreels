import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, JobRepository } from '@mintreels/db';
import { JobsService } from './jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobsService, JobRepository],
  exports: [JobsService],
})
export class JobsModule {}
