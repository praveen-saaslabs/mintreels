import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hook, HookRepository } from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hook]), AuthModule],
  controllers: [HooksController],
  providers: [HooksService, HookRepository],
  exports: [HooksService],
})
export class HooksModule {}
