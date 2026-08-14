import {
  HttpException,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const method = request.method;
    // Path only — never log query strings (may contain tokens) or bodies/cookies.
    const path = (request.originalUrl ?? request.url).split('?')[0] ?? '/';

    if (path === '/health' || path.startsWith('/docs')) {
      return next.handle();
    }

    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${path} ${String(response.statusCode)} ${String(Date.now() - started)}ms`);
        },
        error: (err: unknown) => {
          const status =
            err instanceof HttpException
              ? err.getStatus()
              : response.statusCode >= 400
                ? response.statusCode
                : 500;
          this.logger.log(`${method} ${path} ${String(status)} ${String(Date.now() - started)}ms`);
        },
      }),
    );
  }
}
