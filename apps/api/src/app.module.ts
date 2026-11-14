import { Module } from '@nestjs/common';
import { PlatformModule } from './platform/platform.module.js';
import { HealthModule } from './platform/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { OperatorsModule } from './modules/operators/operators.module.js';
import { ListingsModule } from './modules/listings/listings.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

/**
 * Root application module. All MVP backend domain modules are registered:
 * U1 platform, U2 identity (auth + users), U3 operators & verification,
 * U4 listings/packages/catalog/discovery, U5 availability & slot holds, U6 bookings,
 * U7 payments, U8 finance (refunds/commission/payouts), U9 notifications & audit.
 */
@Module({
  imports: [
    PlatformModule,
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OperatorsModule,
    ListingsModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
    FinanceModule,
    NotificationsModule,
  ],
})
export class AppModule {}
