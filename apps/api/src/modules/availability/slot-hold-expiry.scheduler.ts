import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SlotHoldService } from './slot-hold.service.js';
import { AppLogger } from '../../platform/logger/logger.service.js';

/**
 * Periodically expires overdue slot holds (RESILIENCY: retryable background job).
 * MVP uses an in-process interval; a durable DB-backed queue can replace it when scaling out.
 */
@Injectable()
export class SlotHoldExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private readonly INTERVAL_MS = 60_000;

  constructor(
    private readonly holds: SlotHoldService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.holds.expireDueHolds().catch((err: unknown) => {
        this.logger.error(
          `Slot-hold expiry job failed: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          'SlotHoldExpiryScheduler',
        );
      });
    }, this.INTERVAL_MS);
    // Do not keep the event loop alive solely for this timer.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
