import { z } from 'zod';

/**
 * Shared validation schemas (SECURITY-05: input validation on all API params).
 * Every API input is validated against a schema before processing.
 */

// --- Primitives ---
export const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** Password policy: min 8 chars (SECURITY-12). Breached-password check happens in the auth service. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200);

export const uuidSchema = z.string().uuid();

/** Malaysian phone number, lenient (E.164-ish or local). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number');

/** Money in sen: non-negative safe integer. */
export const senSchema = z
  .number()
  .int('Amount must be an integer (sen)')
  .nonnegative('Amount must be non-negative')
  .max(Number.MAX_SAFE_INTEGER);

export const isoDateSchema = z.string().datetime({ offset: true });

// --- Pagination (NFR-ARCH-3) ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** Idempotency key header value (FR-BOOK-5). */
export const idempotencyKeySchema = z.string().min(8).max(200);

// --- Auth inputs ---
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120),
  phone: phoneSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Search (Discovery, U4) ---
export const listingSearchSchema = paginationSchema.extend({
  state: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  jettyId: uuidSchema.optional(),
  date: z.string().date().optional(),
  tripType: z.string().trim().max(40).optional(),
  minPrice: senSchema.optional(),
  maxPrice: senSchema.optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating']).default('relevance'),
});
export type ListingSearch = z.infer<typeof listingSearchSchema>;

export { z };
