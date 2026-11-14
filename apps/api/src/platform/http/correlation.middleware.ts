import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Assigns/propagates a correlation ID for every request (SECURITY-03, PF-R2).
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: FastifyRequest & { correlationId?: string }, res: FastifyReply, next: () => void): void {
    const incoming = req.headers['x-correlation-id'];
    const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    req.correlationId = correlationId;
    void res.header('x-correlation-id', correlationId);
    next();
  }
}
