import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { APP_CONFIG, type AppConfig } from '../../platform/config/env.js';
import { PaymentsController, PaymentWebhookController } from './payments.controller.js';
import { PaymentsAdminController } from './payments-admin.controller.js';
import { PaymentsService } from './payments.service.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.js';
import { ManualTransferAdapter } from './adapters/manual-transfer.adapter.js';
import { GatewayAdapter } from './adapters/gateway.adapter.js';

@Module({
  imports: [BookingsModule],
  controllers: [PaymentsController, PaymentWebhookController, PaymentsAdminController],
  providers: [
    ManualTransferAdapter,
    GatewayAdapter,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: AppConfig, manual: ManualTransferAdapter, gateway: GatewayAdapter): PaymentProvider =>
        config.PAYMENT_PROVIDER === 'gateway' ? gateway : manual,
      inject: [APP_CONFIG, ManualTransferAdapter, GatewayAdapter],
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
