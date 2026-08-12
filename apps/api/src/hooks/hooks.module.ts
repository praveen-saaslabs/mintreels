import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hook, HookRepository } from '@mintreels/db';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hook])],
  controllers: [HooksController],
  providers: [HooksService, HookRepository],
  exports: [HooksService],
})
export class HooksModule {}
