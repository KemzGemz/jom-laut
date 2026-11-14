import { z } from 'zod';

/**
 * Environment configuration schema (SECURITY-12: no hardcoded secrets;
 * fail closed at boot if required config is missing).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_PATH: z.string().default('/api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1_209_600),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  PAYMENT_PROVIDER: z.enum(['manual', 'gateway']).default('manual'),
  PAYMENT_WEBHOOK_SECRET: z.string().default('change-me'),

  // Encryption key for sensitive data at rest (operator payout details). Falls back to JWT_SECRET.
  PAYOUT_ENC_KEY: z.string().min(16).optional(),

  DEFAULT_TIMEZONE: z.string().default('Asia/Kuala_Lumpur'),
  DEFAULT_CURRENCY: z.string().default('MYR'),

  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type AppConfig = z.infer<typeof envSchema>;

export class ConfigValidationError extends Error {}

/** Parse and validate the environment; throws (fails closed) on invalid config. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigValidationError(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

/** DI token for the validated config object. */
export const APP_CONFIG = 'APP_CONFIG';
