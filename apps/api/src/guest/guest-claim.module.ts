import { Module } from '@nestjs/common';
import { GuestClaimService } from './guest-claim.service';

/**
 * Standalone module for claiming guest data on login. Deliberately depends on
 * nothing but the (global) DataSource so AuthModule can import it without the
 * AuthModule ↔ GuestModule cycle (GuestModule already imports AuthModule for JwtService).
 */
@Module({
  providers: [GuestClaimService],
  exports: [GuestClaimService],
})
export class GuestClaimModule {}
