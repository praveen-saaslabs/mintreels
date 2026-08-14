import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { HttpError } from '../common/http-error';
import type { RequestActor } from '../auth/auth.types';

/** Returns the principal resolved by IdentityGuard (user or guest). */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestActor => {
    const request = ctx.switchToHttp().getRequest<{ actor?: RequestActor }>();
    if (!request.actor) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    return request.actor;
  },
);
