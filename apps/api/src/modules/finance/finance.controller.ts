import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { Role, CancelReason } from '@jom-laut/shared-types';
import { RefundsService } from './refunds.service.js';
import { PayoutsService } from './payouts.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const cancelSchema = z.object({
  reason: z.enum(['CUSTOMER_REQUEST', 'OPERATOR_REQUEST', 'WEATHER_SAFETY', 'FORCE_MAJEURE', 'ADMIN_OVERRIDE']),
});

@Controller()
export class FinanceController {
  constructor(
    private readonly refunds: RefundsService,
    private readonly payouts: PayoutsService,
  ) {}

  private user(user: JwtPayload | undefined): { sub: string; role: string } {
    if (!user) throw new UnauthorizedException();
    return { sub: user.sub, role: user.role };
  }

  /** Customer or operator requests cancellation (US-15). */
  @Roles(Role.CUSTOMER, Role.OPERATOR, Role.OPERATOR_MEMBER, Role.ADMIN)
  @Post('bookings/:id/cancellation-requests')
  requestCancellation(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelSchema)) dto: { reason: CancelReason },
  ) {
    return this.refunds.requestCancellation(this.user(user), id, dto.reason);
  }

  /** Operator earnings (US-25). */
  @Roles(Role.OPERATOR, Role.OPERATOR_MEMBER, Role.ADMIN)
  @Get('operators/:operatorId/earnings')
  earnings(@CurrentUser() user: JwtPayload | undefined, @Param('operatorId') operatorId: string) {
    return this.payouts.getEarnings(this.user(user), operatorId);
  }
}
