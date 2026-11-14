import { Body, Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Role } from '@jom-laut/shared-types';
import { z } from '@jom-laut/validation';
import { OperatorsService } from './operators.service.js';
import { VerificationService } from './verification.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const reasonSchema = z.object({ reason: z.string().trim().max(500).optional() });
const suspendSchema = z.object({ suspended: z.boolean(), reason: z.string().trim().min(1).max(500) });
const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});

/** Admin-only operator administration (US-26/US-27). Guarded by RBAC. */
@Roles(Role.ADMIN)
@Controller('admin')
export class OperatorsAdminController {
  constructor(
    private readonly operators: OperatorsService,
    private readonly verification: VerificationService,
  ) {}

  private adminId(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post('operators/:id/approve')
  approve(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) dto: { reason?: string },
  ) {
    return this.operators.setApprovalStatus(this.adminId(user), id, 'APPROVED', dto.reason);
  }

  @Post('operators/:id/reject')
  reject(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) dto: { reason?: string },
  ) {
    return this.operators.setApprovalStatus(this.adminId(user), id, 'REJECTED', dto.reason);
  }

  @Post('operators/:id/suspension')
  suspend(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(suspendSchema)) dto: { suspended: boolean; reason: string },
  ) {
    return this.operators.setSuspension(this.adminId(user), id, dto.suspended, dto.reason);
  }

  @Post('verification/:docId/review')
  review(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('docId') docId: string,
    @Body(new ZodValidationPipe(reviewSchema)) dto: { decision: 'APPROVED' | 'REJECTED'; note?: string },
  ) {
    return this.verification.reviewDocument(this.adminId(user), docId, dto.decision, dto.note);
  }
}
