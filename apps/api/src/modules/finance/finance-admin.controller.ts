import { Body, Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { Role } from '@jom-laut/shared-types';
import { RefundsService } from './refunds.service.js';
import { PayoutsService } from './payouts.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const feeSchema = z.object({
  commissionBasisPoints: z.number().int().min(0).max(10_000),
  customerFeeSen: z.number().int().nonnegative().optional(),
});
const payoutSchema = z.object({ bookingIds: z.array(z.string().uuid()).min(1) });
const completeSchema = z.object({ reference: z.string().trim().min(1).max(120) });

/** Admin financial administration (US-30/31/32/33). */
@Roles(Role.ADMIN)
@Controller('admin')
export class FinanceAdminController {
  constructor(
    private readonly refunds: RefundsService,
    private readonly payouts: PayoutsService,
  ) {}

  private adminId(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post('bookings/:id/cancellation/approve')
  approveCancellation(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.refunds.adminApproveCancellation(this.adminId(user), id);
  }

  @Post('platform-fees')
  setFee(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(feeSchema)) dto: { commissionBasisPoints: number; customerFeeSen?: number },
  ) {
    return this.payouts.setPlatformFee(this.adminId(user), dto.commissionBasisPoints, dto.customerFeeSen ?? 0);
  }

  @Post('operators/:operatorId/payouts')
  createPayout(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('operatorId') operatorId: string,
    @Body(new ZodValidationPipe(payoutSchema)) dto: { bookingIds: string[] },
  ) {
    return this.payouts.createPayout(this.adminId(user), operatorId, dto.bookingIds);
  }

  @Post('payouts/:id/complete')
  completePayout(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completeSchema)) dto: { reference: string },
  ) {
    return this.payouts.markPayoutCompleted(this.adminId(user), id, dto.reference);
  }
}
