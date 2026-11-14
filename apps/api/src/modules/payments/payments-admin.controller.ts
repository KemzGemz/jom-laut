import { Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Role } from '@jom-laut/shared-types';
import { PaymentsService } from './payments.service.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

/** Admin manual-payment verification (US-34). */
@Roles(Role.ADMIN)
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':id/verify')
  verify(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    if (!user) throw new UnauthorizedException();
    return this.payments.confirmManualTransfer(user.sub, id);
  }
}
