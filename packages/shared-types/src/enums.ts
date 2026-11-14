/** Shared domain enums used across units. */

export const Role = {
  CUSTOMER: 'CUSTOMER',
  OPERATOR: 'OPERATOR',
  OPERATOR_MEMBER: 'OPERATOR_MEMBER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Booking lifecycle states (brief Section 8.2). */
export const BookingStatus = {
  DRAFT: 'DRAFT',
  SLOT_HELD: 'SLOT_HELD',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PENDING_OPERATOR_APPROVAL: 'PENDING_OPERATOR_APPROVAL',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLATION_REQUESTED: 'CANCELLATION_REQUESTED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  EXPIRED: 'EXPIRED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  PROCESSING: 'PROCESSING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const BookingModel = {
  INSTANT: 'INSTANT',
  REQUEST_TO_BOOK: 'REQUEST_TO_BOOK',
} as const;
export type BookingModel = (typeof BookingModel)[keyof typeof BookingModel];

export const PaymentMode = {
  FULL: 'FULL',
  DEPOSIT: 'DEPOSIT',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const CancelReason = {
  CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
  OPERATOR_REQUEST: 'OPERATOR_REQUEST',
  WEATHER_SAFETY: 'WEATHER_SAFETY',
  FORCE_MAJEURE: 'FORCE_MAJEURE',
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
} as const;
export type CancelReason = (typeof CancelReason)[keyof typeof CancelReason];
