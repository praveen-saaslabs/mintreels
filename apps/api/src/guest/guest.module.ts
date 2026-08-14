import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  GuestSession,
  GuestSessionRepository,
  Project,
  ProjectRepository,
  Recording,
  RecordingRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { GuestQuotaService } from './guest-quota.service';
import { GuestRateLimitGuard } from './guest-rate-limit.guard';
import { GuestSessionService } from './guest-session.service';
import { IdentityGuard } from './identity.guard';

@Module({
  imports: [TypeOrmModule.forFeature([GuestSession, Project, Recording]), AuthModule],
  providers: [
    GuestSessionService,
    GuestSessionRepository,
    ProjectRepository,
    RecordingRepository,
    GuestQuotaService,
    GuestRateLimitGuard,
    IdentityGuard,
  ],
  exports: [
    // Re-export AuthModule so JwtService (an IdentityGuard dependency) is
    // resolvable in every module that imports GuestModule and applies the
    // guard via @UseGuards — controller-scoped guards are resolved in the
    // consuming module's injector, not GuestModule's.
    AuthModule,
    IdentityGuard,
    GuestRateLimitGuard,
    GuestQuotaService,
    GuestSessionService,
    GuestSessionRepository,
  ],
})
export class GuestModule {}
