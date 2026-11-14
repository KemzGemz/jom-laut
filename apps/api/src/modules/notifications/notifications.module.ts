import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { ConsoleEmailAdapter, NOTIFICATION_SENDER } from './notification-sender.js';

@Module({
  providers: [
    NotificationsService,
    ConsoleEmailAdapter,
    { provide: NOTIFICATION_SENDER, useClass: ConsoleEmailAdapter },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
