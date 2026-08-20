import { Injectable } from '@nestjs/common';
import { UserRepository, type User } from '@mintreels/db';
import type { UserPublic } from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import type { LoginRequest, SignupRequest } from './auth.dto';
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
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupRequest): Promise<AuthTokenResult> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new HttpError(409, 'USER_ALREADY_EXISTS');
    }

    const user = this.users.create({
      email,
      passwordHash: await this.passwords.hash(input.password),
      name: null,
    });
    await this.users.save(user);
    return { user: toPublicUser(user), token: this.jwt.sign(user.id) };
  }

  async login(input: LoginRequest): Promise<AuthTokenResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const passwordOk =
      user !== null && (await this.passwords.verify(input.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new HttpError(401, 'INVALID_CREDENTIALS');
    }
    return { user: toPublicUser(user), token: this.jwt.sign(user.id) };
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
  return { id: user.id, email: user.email };
}
