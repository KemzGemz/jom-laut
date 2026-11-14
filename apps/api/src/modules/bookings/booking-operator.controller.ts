import { Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Role } from '@jom-laut/shared-types';
import { BookingService } from './booking.service.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

/** Operator booking management (US-23/24). */
@Roles(Role.OPERATOR, Role.OPERATOR_MEMBER)
@Controller('operator/bookings')
export class BookingOperatorController {
  constructor(private readonly bookings: BookingService) {}

  private uid(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.bookings.operatorDecision(this.uid(user), id, 'ACCEPT');
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.bookings.operatorDecision(this.uid(user), id, 'REJECT');
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.bookings.markOutcome(this.uid(user), id, 'COMPLETED');
  }

  @Post(':id/no-show')
  noShow(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.bookings.markOutcome(this.uid(user), id, 'NO_SHOW');
  }
}
