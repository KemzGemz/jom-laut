import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  emailSchema,
  passwordSchema,
  senSchema,
  paginationSchema,
  registerSchema,
} from '../src/index';

describe('validation schemas — example-based', () => {
  it('accepts valid email and lowercases it', () => {
    expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
  });

  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longenough').success).toBe(true);
  });

  it('rejects negative/non-integer sen', () => {
    expect(senSchema.safeParse(-1).success).toBe(false);
    expect(senSchema.safeParse(1.5).success).toBe(false);
    expect(senSchema.safeParse(25000).success).toBe(true);
  });

  it('applies pagination defaults', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('validates a full register payload', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'password1',
      fullName: 'Aiman',
    });
    expect(r.success).toBe(true);
  });
});

describe('validation schemas — property-based', () => {
  it('senSchema accepts exactly the non-negative safe integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), (n) => {
        expect(senSchema.safeParse(n).success).toBe(true);
      }),
    );
  });

  it('senSchema rejects all negative integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: -1 }), (n) => {
        expect(senSchema.safeParse(n).success).toBe(false);
      }),
    );
  });
});
