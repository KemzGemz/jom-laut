import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, type Prisma } from '@prisma/client';

/**
 * Prisma database access (NFR-ARCH-1). Provides a transaction helper used by
 * application services that own transaction boundaries (booking/payment/refund).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Run a function inside a serializable-safe interactive transaction. */
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }
}
