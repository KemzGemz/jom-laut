import { describe, it, expect } from 'vitest';
import { TokenService } from './token.service.js';
import type { AppConfig } from '../config/env.js';
import { Role } from '@jom-laut/shared-types';

const config = { JWT_SECRET: 'test-secret-at-least-16-chars', JWT_ACCESS_TTL: 900 } as AppConfig;
const tokens = new TokenService(config);

describe('TokenService', () => {
  it('signs and verifies a token round-trip', () => {
    const token = tokens.sign({ sub: 'user-1', role: Role.CUSTOMER });
    const payload = tokens.verify(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe(Role.CUSTOMER);
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejects a tampered payload', () => {
    const token = tokens.sign({ sub: 'user-1', role: Role.CUSTOMER });
    const [header, , signature] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ sub: 'attacker', role: 'ADMIN', iat: 1, exp: 9_999_999_999 })).toString('base64url');
    const forged = `${header}.${forgedBody}.${signature}`;
    expect(() => tokens.verify(forged)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const other = new TokenService({ JWT_SECRET: 'a-completely-different-secret', JWT_ACCESS_TTL: 900 } as AppConfig);
    const token = other.sign({ sub: 'user-1', role: Role.CUSTOMER });
    expect(() => tokens.verify(token)).toThrow('Invalid signature');
  });

  it('rejects an expired token', () => {
    const token = tokens.sign({ sub: 'user-1', role: Role.CUSTOMER }, -1);
    expect(() => tokens.verify(token)).toThrow('expired');
  });

  it('rejects malformed tokens', () => {
    expect(() => tokens.verify('not-a-token')).toThrow('Malformed token');
  });
});
