import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../platform/logger/logger.service.js';

export interface OutboundNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
}

/** NotificationSender port (email/SMS/push). Adapters are swappable. */
export interface NotificationSender {
  readonly channel: string;
  send(notification: OutboundNotification): Promise<void>;
}

export const NOTIFICATION_SENDER = 'NOTIFICATION_SENDER';

/**
 * Development email adapter (logs instead of sending). Production binds a real
 * SMTP/API adapter. Failures are surfaced so the caller can retry (FR-NOTIF-2).
 */
@Injectable()
export class ConsoleEmailAdapter implements NotificationSender {
  readonly channel = 'email';
  constructor(private readonly logger: AppLogger) {}

  async send(notification: OutboundNotification): Promise<void> {
    this.logger.log(`[email] -> ${notification.userId}: ${notification.title}`, 'NotificationSender');
  }
}
