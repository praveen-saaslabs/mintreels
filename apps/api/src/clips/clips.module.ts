import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clip, ClipRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Clip]), AuthModule],
  controllers: [ClipsController],
  providers: [ClipsService, ClipRepository],
  exports: [ClipsService],
})
export class ClipsModule {}
