import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppLogger } from '../logger/logger.service.js';

/**
 * Global error handler (SECURITY-09/15): consistent error envelope,
 * generic messages in production (never leak stack traces / internals).
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();
    const correlationId = request.correlationId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        code = (r['code'] as string) ?? httpStatusToCode(status);
        message = (r['message'] as string) ?? exception.message;
        details = r['details'];
      } else {
        code = httpStatusToCode(status);
        message = String(res);
      }
    }

    // Log full detail server-side (with correlation id); return safe payload to client.
    this.logger.error(
      `[${correlationId}] ${status} ${code}: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
      'AllExceptionsFilter',
    );

    const body = {
      error: {
        code,
        message: this.isProd && status === HttpStatus.INTERNAL_SERVER_ERROR ? 'An unexpected error occurred' : message,
        correlationId,
        ...(this.isProd ? {} : details ? { details } : {}),
      },
    };
    void reply.status(status).send(body);
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return 'ERROR';
  }
}
