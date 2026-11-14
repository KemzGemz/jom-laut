import { describe, it, expect } from 'vitest';
import { renderNotification, notifiableEventTypes } from './notification-templates.js';

describe('notification templates', () => {
  it('maps known events to templates', () => {
    expect(renderNotification('PaymentConfirmed')?.type).toBe('PAYMENT_CONFIRMED');
    expect(renderNotification('BookingConfirmed')?.title).toBe('Booking confirmed');
  });

  it('returns null for unknown events', () => {
    expect(renderNotification('SomethingElse')).toBeNull();
  });

  it('every notifiable event renders a non-empty template', () => {
    for (const t of notifiableEventTypes()) {
      const tpl = renderNotification(t);
      expect(tpl).not.toBeNull();
      expect(tpl!.title.length).toBeGreaterThan(0);
      expect(tpl!.body.length).toBeGreaterThan(0);
    }
  });
});
