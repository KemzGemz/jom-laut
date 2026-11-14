import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { FinanceController } from './finance.controller.js';
import { FinanceAdminController } from './finance-admin.controller.js';
import { RefundsService } from './refunds.service.js';
import { PayoutsService } from './payouts.service.js';

@Module({
  imports: [BookingsModule, PaymentsModule],
  controllers: [FinanceController, FinanceAdminController],
  providers: [RefundsService, PayoutsService],
  exports: [RefundsService, PayoutsService],
})
export class FinanceModule {}
