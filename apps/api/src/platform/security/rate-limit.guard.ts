import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { APP_CONFIG, type AppConfig } from '../config/env.js';

/**
 * Lightweight in-memory fixed-window rate limiter (SECURITY-11/12).
 * Adequate for a single-node MVP; swap for a Redis-backed limiter when scaling out.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const key = `${req.ip}:${req.routeOptions?.url ?? req.url}`;
    const now = Date.now();
    const windowMs = this.config.RATE_LIMIT_TTL * 1000;

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    if (entry.count > this.config.RATE_LIMIT_MAX) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
