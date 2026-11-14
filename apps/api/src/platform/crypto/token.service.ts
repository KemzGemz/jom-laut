import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import type { Role } from '@jom-laut/shared-types';

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  operatorId?: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Minimal HS256 JWT implementation using Node crypto (no external dependency).
 * Behind the AuthProvider abstraction (D2=C): swappable for a managed provider later.
 */
@Injectable()
export class TokenService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSeconds = this.config.JWT_ACCESS_TTL): string {
    const now = Math.floor(Date.now() / 1000);
    const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify(full));
    const signature = this.hmac(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): JwtPayload {
    const segments = token.split('.');
    if (segments.length !== 3) throw new Error('Malformed token');
    const [header, body, signature] = segments as [string, string, string];
    const expected = this.hmac(`${header}.${body}`);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid signature');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
    if (payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token expired');
    return payload;
  }

  private hmac(data: string): string {
    return createHmac('sha256', this.config.JWT_SECRET).update(data).digest('base64url');
  }
}
