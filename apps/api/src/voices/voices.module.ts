import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoicesController } from './voices.controller';
import { VoicesService } from './voices.service';

@Module({
  imports: [AuthModule],
  controllers: [VoicesController],
  providers: [VoicesService],
})
export class VoicesModule {}
