import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRepository } from '@mintreels/db';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtService,
    EmailVerificationService,
    AuthGuard,
    UserRepository,
  ],
  exports: [AuthGuard, JwtService],
})
export class AuthModule {}
