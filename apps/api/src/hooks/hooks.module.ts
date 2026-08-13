import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hook, HookRepository, Recording, RecordingRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { ClipsModule } from '../clips/clips.module';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hook, Recording]), AuthModule, ClipsModule],
  controllers: [HooksController],
  providers: [HooksService, HookRepository, RecordingRepository],
  exports: [HooksService],
})
export class HooksModule {}
