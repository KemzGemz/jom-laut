import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Pagination } from '@jom-laut/validation';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface AuditEntryInput {
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string;
  correlationId?: string;
}

/**
 * Append-only audit logging (FR-AUDIT-1/2/3). Records are never updated or deleted
 * by application code; queries are admin-only.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason ?? null,
        correlationId: entry.correlationId ?? null,
      },
    });
  }

  async query(filter: { targetType?: string; targetId?: string; actorId?: string }, page: Pagination) {
    const where: Prisma.AuditLogWhereInput = {
      ...(filter.targetType ? { targetType: filter.targetType } : {}),
      ...(filter.targetId ? { targetId: filter.targetId } : {}),
      ...(filter.actorId ? { actorId: filter.actorId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }
}
