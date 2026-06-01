import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { sanitizeRequestUrl } from '../observability/log-sanitizer';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string) ?? randomUUID();
    response.setHeader('x-request-id', requestId);

    const { method } = request;
    const path = sanitizeRequestUrl(request.url);
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          this.logger.log({
            requestId,
            method,
            path,
            statusCode: response.statusCode,
            durationMs,
            outcome: 'http_success',
          });
        },
        error: (error: Error) => {
          const durationMs = Date.now() - start;
          this.logger.warn({
            requestId,
            method,
            path,
            statusCode: response.statusCode,
            durationMs,
            outcome: 'http_error',
            errorKind: error.name,
          });
        },
      }),
    );
  }
}
