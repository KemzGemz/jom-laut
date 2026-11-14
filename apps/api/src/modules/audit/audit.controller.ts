import { Controller, Get, Query } from '@nestjs/common';
import { paginationSchema, z } from '@jom-laut/validation';
import type { Pagination } from '@jom-laut/validation';
import { Role } from '@jom-laut/shared-types';
import { AuditService } from './audit.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { Roles } from '../../platform/security/decorators.js';

const auditQuerySchema = paginationSchema.extend({
  targetType: z.string().trim().max(60).optional(),
  targetId: z.string().trim().max(60).optional(),
  actorId: z.string().uuid().optional(),
});

/** Admin audit-log access (FR-AUDIT). */
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(auditQuerySchema))
    q: Pagination & { targetType?: string; targetId?: string; actorId?: string },
  ) {
    return this.audit.query({ targetType: q.targetType, targetId: q.targetId, actorId: q.actorId }, q);
  }
}
