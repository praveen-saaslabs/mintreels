import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { HttpError } from '../common/http-error';
import type { RequestUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!request.user) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    return request.user;
  },
);
