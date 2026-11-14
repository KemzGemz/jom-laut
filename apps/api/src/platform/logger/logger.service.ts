import { Injectable, type LoggerService } from '@nestjs/common';
import { pino, type Logger } from 'pino';

/**
 * Structured logging (SECURITY-03). JSON logs to stdout with correlation IDs.
 * Secrets/PII must never be logged — callers pass safe fields only.
 */
@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      redact: {
        paths: ['password', 'passwordHash', 'token', 'authorization', '*.password', 'req.headers.authorization'],
        censor: '[REDACTED]',
      },
      formatters: { level: (label: string) => ({ level: label }) },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, String(message));
  }
}
