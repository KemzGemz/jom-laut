import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module.js';
import { BookingController } from './booking.controller.js';
import { BookingOperatorController } from './booking-operator.controller.js';
import { BookingService } from './booking.service.js';

@Module({
  imports: [AvailabilityModule],
  controllers: [BookingController, BookingOperatorController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingsModule {}
