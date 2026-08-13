import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { UserRepository, type User } from '@mintreels/db';
import { EmailService } from '../email/email.service';
import { HttpError } from '../common/http-error';
import { PasswordService } from './password.service';

const OTP_TTL_MS = 2 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30_000;

@Injectable()
export class EmailVerificationService {
  // ponytail: process-local cooldown; upgrade to Redis if api is multi-instance
  private readonly resendCooldownByEmail = new Map<string, number>();

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly email: EmailService,
  ) {}

  async issueAndSend(user: User): Promise<void> {
    const otp = String(randomInt(1000, 10000));
    user.emailVerificationCodeHash = await this.passwords.hash(otp);
    user.emailVerificationExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.users.save(user);
    await this.email.sendVerificationEmail(user.email, otp);
  }

  async resend(user: User): Promise<void> {
    this.assertResendAllowed(user.email);
    await this.issueAndSend(user);
  }

  async verifyCode(user: User, code: string): Promise<void> {
    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      throw new HttpError(400, 'INVALID_VERIFICATION_CODE');
    }
    if (user.emailVerificationExpiresAt.getTime() <= Date.now()) {
      throw new HttpError(400, 'VERIFICATION_CODE_EXPIRED');
    }
    const matches = await this.passwords.verify(code, user.emailVerificationCodeHash);
    if (!matches) {
      throw new HttpError(400, 'INVALID_VERIFICATION_CODE');
    }
    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    await this.users.save(user);
  }

  private assertResendAllowed(email: string): void {
    const key = email.trim().toLowerCase();
    const now = Date.now();
    const lastSentAt = this.resendCooldownByEmail.get(key);
    if (lastSentAt !== undefined && now - lastSentAt < RESEND_COOLDOWN_MS) {
      throw new HttpError(429, 'RATE_LIMITED');
    }
    this.resendCooldownByEmail.set(key, now);
  }
}
