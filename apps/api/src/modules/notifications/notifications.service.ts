import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EventBus, type DomainEvent } from '../../platform/events/event-bus.js';
import { AppLogger } from '../../platform/logger/logger.service.js';
import { renderNotification, notifiableEventTypes } from './notification-templates.js';
import { NOTIFICATION_SENDER, type NotificationSender } from './notification-sender.js';

/**
 * Event-driven notifications (US-35, FR-NOTIF-1/2). Subscribes to the domain event
 * bus; persists an in-app Notification and attempts delivery. Runs after commit and
 * is error-isolated by the EventBus, so a delivery failure never affects the
 * originating booking/payment transaction.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly logger: AppLogger,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  onModuleInit(): void {
    for (const type of notifiableEventTypes()) {
      this.events.subscribe(type, (event) => this.handle(event));
    }
  }

  async handle(event: DomainEvent): Promise<void> {
    const template = renderNotification(event.type);
    if (!template) return;

    const recipients = await this.resolveRecipients(event);
    for (const userId of recipients) {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: template.type,
          channel: this.sender.channel,
          payload: (event.payload ?? {}) as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      await this.deliver(notification.id, { userId, type: template.type, title: template.title, body: template.body });
    }
  }

  private async deliver(id: string, payload: { userId: string; type: string; title: string; body: string }): Promise<void> {
    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      try {
        await this.sender.send(payload);
        await this.prisma.notification.update({ where: { id }, data: { sentAt: new Date(), attempts: attempt } });
        return;
      } catch (err) {
        await this.prisma.notification.update({ where: { id }, data: { attempts: attempt } });
        this.logger.warn(
          `Notification ${id} delivery attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`,
          'NotificationsService',
        );
      }
    }
    // Left unsent for a later retry sweep; never throws into the caller.
  }

  private async resolveRecipients(event: DomainEvent): Promise<string[]> {
    const payload = (event.payload ?? {}) as { bookingId?: string; operatorId?: string };
    const recipients = new Set<string>();

    if (payload.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: payload.bookingId },
        select: { customerId: true, listing: { select: { operatorId: true } } },
      });
      if (booking) {
        recipients.add(booking.customerId);
        if (event.type === 'BookingConfirmed') {
          const owner = await this.operatorOwner(booking.listing.operatorId);
          if (owner) recipients.add(owner);
        }
      }
    }

    if (payload.operatorId) {
      const owner = await this.operatorOwner(payload.operatorId);
      if (owner) recipients.add(owner);
    }

    return [...recipients];
  }

  private async operatorOwner(operatorId: string): Promise<string | null> {
    const member = await this.prisma.operatorMember.findFirst({
      where: { operatorId, role: 'OPERATOR' },
      select: { userId: true },
    });
    return member?.userId ?? null;
  }
}
