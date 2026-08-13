import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { loadJwtConfig } from '../common/auth.config';
import { HttpError } from '../common/http-error';

const tokenLib =
  typeof (jwt as { sign?: unknown }).sign === 'function'
    ? jwt
    : (jwt as unknown as { default: typeof jwt }).default;

@Injectable()
export class JwtService {
  private config: ReturnType<typeof loadJwtConfig> | undefined;

  sign(userId: number): string {
    const { secret, expiresIn } = this.getConfig();
    return tokenLib.sign({ sub: String(userId) }, secret, { expiresIn } as jwt.SignOptions);
  }

  verify(token: string): { id: number } {
    if (!token) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }

    let decoded: unknown;
    try {
      decoded = tokenLib.verify(token, this.getConfig().secret);
    } catch {
      throw new HttpError(401, 'UNAUTHORIZED');
    }

    return { id: parseUserId(decoded) };
  }

  private getConfig(): ReturnType<typeof loadJwtConfig> {
    this.config ??= loadJwtConfig();
    return this.config;
  }
}

function parseUserId(decoded: unknown): number {
  if (typeof decoded !== 'object' || decoded === null || !('sub' in decoded)) {
    throw new HttpError(401, 'UNAUTHORIZED');
  }

  const { sub } = decoded;
  if (typeof sub !== 'string') {
    throw new HttpError(401, 'UNAUTHORIZED');
  }

  const id = Number.parseInt(sub, 10);
  if (!Number.isInteger(id) || id < 1 || String(id) !== sub) {
    throw new HttpError(401, 'UNAUTHORIZED');
  }

  return id;
}
