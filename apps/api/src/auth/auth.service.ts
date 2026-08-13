import { Injectable } from '@nestjs/common';
import { UserRepository, type User } from '@mintreels/db';
import type { UserPublic } from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import type { LoginRequest, SignupRequest, VerifyEmailRequest } from './auth.dto';
import { EmailVerificationService } from './email-verification.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

export interface AuthTokenResult {
  user: UserPublic;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly emailVerification: EmailVerificationService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupRequest): Promise<{ requiresEmailVerification: true }> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new HttpError(409, 'USER_ALREADY_EXISTS');
    }

    const user = this.users.create({
      email,
      passwordHash: await this.passwords.hash(input.password),
      emailVerified: false,
      name: null,
      emailVerificationCodeHash: null,
      emailVerificationExpiresAt: null,
    });
    await this.users.save(user);
    await this.emailVerification.issueAndSend(user);
    return { requiresEmailVerification: true };
  }

  async login(input: LoginRequest): Promise<AuthTokenResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const passwordOk =
      user !== null && (await this.passwords.verify(input.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new HttpError(401, 'INVALID_CREDENTIALS');
    }
    if (!user.emailVerified) {
      throw new HttpError(403, 'EMAIL_NOT_VERIFIED');
    }
    return { user: toPublicUser(user), token: this.jwt.sign(user.id) };
  }

  async verifyEmail(input: VerifyEmailRequest): Promise<AuthTokenResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) {
      throw new HttpError(400, 'INVALID_VERIFICATION_CODE');
    }
    await this.emailVerification.verifyCode(user, input.code);
    return { user: toPublicUser(user), token: this.jwt.sign(user.id) };
  }

  async resendVerification(email: string): Promise<{ requiresEmailVerification: true }> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (user && !user.emailVerified) {
      await this.emailVerification.resend(user);
    }
    return { requiresEmailVerification: true };
  }

  async me(userId: number): Promise<UserPublic> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    return toPublicUser(user);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: User): UserPublic {
  return { id: user.id, email: user.email, emailVerified: user.emailVerified };
}
