/**
 * Money handling for Jom Laut.
 *
 * All monetary values are stored and computed as integer minor units ("sen").
 * RM 1.00 = 100 sen. Never use floating point for money (FR-FIN-10, US-40).
 */

export const CURRENCY = 'MYR' as const;
export type Currency = typeof CURRENCY;

/** Branded integer type representing a non-negative amount in sen. */
export type Sen = number & { readonly __brand: 'Sen' };

export interface Money {
  readonly amount: Sen;
  readonly currency: Currency;
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/** True when a value is a safe, non-negative integer usable as sen. */
export function isValidSen(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value);
}

/** Construct a Sen value, throwing on invalid input. */
export function toSen(value: number): Sen {
  if (!isValidSen(value)) {
    throw new MoneyError(`Invalid sen amount: ${value} (must be a non-negative safe integer)`);
  }
  return value as Sen;
}

export function money(amount: number): Money {
  return { amount: toSen(amount), currency: CURRENCY };
}

/** Add two sen amounts. Result is always a valid Sen. */
export function addSen(a: Sen, b: Sen): Sen {
  return toSen(a + b);
}

/**
 * Subtract b from a. Throws if the result would be negative
 * (money must never go negative — PF-R1 / SECURITY fail-closed).
 */
export function subSen(a: Sen, b: Sen): Sen {
  const result = a - b;
  if (result < 0) {
    throw new MoneyError(`Subtraction would produce negative money: ${a} - ${b}`);
  }
  return toSen(result);
}

/** Multiply a sen amount by a non-negative integer quantity (e.g., per-person pricing). */
export function mulSen(a: Sen, quantity: number): Sen {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new MoneyError(`Quantity must be a non-negative integer: ${quantity}`);
  }
  return toSen(a * quantity);
}

/**
 * Apply a percentage (basis points) to a sen amount, rounding half-up.
 * e.g., 1000 bps = 10%. Used for commission (FR-FIN-6).
 */
export function percentOfSen(a: Sen, basisPoints: number): Sen {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) {
    throw new MoneyError(`Basis points must be a non-negative integer: ${basisPoints}`);
  }
  return toSen(Math.round((a * basisPoints) / 10_000));
}

/** Format a sen amount as an MYR display string, e.g. 25000 -> "RM250.00". */
export function formatMyr(amount: Sen): string {
  const ringgit = Math.floor(amount / 100);
  const sen = amount % 100;
  return `RM${ringgit}.${sen.toString().padStart(2, '0')}`;
}

/**
 * Parse an MYR display string back into sen. Inverse of formatMyr.
 * Accepts optional "RM" prefix, thousands separators, and 0-2 decimals.
 */
export function parseMyr(input: string): Sen {
  const cleaned = input.trim().replace(/^RM/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(`Invalid MYR string: ${input}`);
  }
  const [ringgitPart, senPart = ''] = cleaned.split('.');
  const ringgit = Number(ringgitPart);
  const sen = Number(senPart.padEnd(2, '0'));
  return toSen(ringgit * 100 + sen);
}
