import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SecurityModule } from './security/security.module.js';
import { StorageModule } from './storage/storage.module.js';
import { EventsModule } from './events/events.module.js';
import { AuthGuard } from './security/auth.guard.js';
import { RolesGuard } from './security/roles.guard.js';
import { AllExceptionsFilter } from './http/all-exceptions.filter.js';
import { CorrelationMiddleware } from './http/correlation.middleware.js';

/**
 * Platform Foundation (U1). Wires cross-cutting concerns applied to every module:
 * config, logging, DB, security guards (deny-by-default auth + RBAC), consistent
 * error handling, and correlation propagation.
 */
@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule, SecurityModule, StorageModule, EventsModule],
  providers: [
    // Global guards run in order: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Consistent, safe error envelope for all responses.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [ConfigModule, LoggerModule, PrismaModule, SecurityModule, StorageModule, EventsModule],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
