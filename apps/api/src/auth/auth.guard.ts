import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { AUTH_COOKIE_NAME } from '../common/auth.config';
import { HttpError } from '../common/http-error';
import type { RequestUser } from './auth.types';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string | undefined>;
      user?: RequestUser;
    }>();
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    request.user = this.jwt.verify(token);
    return true;
  }
}
