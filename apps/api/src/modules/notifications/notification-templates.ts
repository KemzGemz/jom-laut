/**
 * Pure mapping from domain event type → notification content (FR-NOTIF-1).
 * Kept pure and side-effect-free so it is directly unit-testable.
 */
export interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
}

const TEMPLATES: Record<string, NotificationTemplate> = {
  OperatorApproved: { type: 'OPERATOR_APPROVED', title: 'Operator approved', body: 'Your operator account has been approved.' },
  OperatorRejected: { type: 'OPERATOR_REJECTED', title: 'Operator application update', body: 'Your operator application was not approved.' },
  BookingConfirmed: { type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', body: 'Your booking is confirmed.' },
  BookingRejected: { type: 'BOOKING_REJECTED', title: 'Booking rejected', body: 'Your booking request was rejected.' },
  BookingCompleted: { type: 'BOOKING_COMPLETED', title: 'Trip completed', body: 'Your trip has been marked completed.' },
  PaymentConfirmed: { type: 'PAYMENT_CONFIRMED', title: 'Payment received', body: 'We have received your payment.' },
  PaymentFailed: { type: 'PAYMENT_FAILED', title: 'Payment failed', body: 'Your payment could not be processed.' },
  CancellationRequested: { type: 'CANCELLATION_REQUESTED', title: 'Cancellation requested', body: 'A cancellation has been requested.' },
  RefundInitiated: { type: 'REFUND_INITIATED', title: 'Refund initiated', body: 'Your refund has been initiated.' },
  RefundCompleted: { type: 'REFUND_COMPLETED', title: 'Refund completed', body: 'Your refund has been completed.' },
  PayoutCompleted: { type: 'PAYOUT_COMPLETED', title: 'Payout completed', body: 'A payout has been completed.' },
};

export function renderNotification(eventType: string): NotificationTemplate | null {
  return TEMPLATES[eventType] ?? null;
}

export function notifiableEventTypes(): string[] {
  return Object.keys(TEMPLATES);
}
