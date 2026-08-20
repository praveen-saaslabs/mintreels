import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRepository } from '@mintreels/db';
import { GuestClaimModule } from '../guest/guest-claim.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), GuestClaimModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtService,
    AuthGuard,
    UserRepository,
  ],
  exports: [AuthGuard, JwtService],
})
export class AuthModule {}
