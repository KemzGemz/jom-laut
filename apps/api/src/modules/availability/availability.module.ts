import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { SlotHoldService } from './slot-hold.service.js';
import { SlotHoldExpiryScheduler } from './slot-hold-expiry.scheduler.js';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, SlotHoldService, SlotHoldExpiryScheduler],
  exports: [AvailabilityService, SlotHoldService],
})
export class AvailabilityModule {}
