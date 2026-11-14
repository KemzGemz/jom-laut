import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { Role } from '@jom-laut/shared-types';
import { BookingService, type CreateBookingInput } from './booking.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const holdSchema = z.object({ slotId: z.string().uuid() });
const createBookingSchema = z.object({
  holdId: z.string().uuid(),
  packageId: z.string().uuid(),
  participantCount: z.number().int().min(1),
  participants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(20).optional(),
        isEmergencyContact: z.boolean().optional(),
      }),
    )
    .min(1),
  organiserNotes: z.string().trim().max(1000).optional(),
});

@Roles(Role.CUSTOMER)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  private uid(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post('holds')
  hold(@CurrentUser() user: JwtPayload | undefined, @Body(new ZodValidationPipe(holdSchema)) dto: { slotId: string }) {
    return this.bookings.acquireHold(this.uid(user), dto.slotId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookings.createBooking(this.uid(user), dto, idempotencyKey);
  }

  @Roles(Role.CUSTOMER, Role.OPERATOR, Role.OPERATOR_MEMBER, Role.ADMIN)
  @Get(':id')
  get(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    if (!user) throw new UnauthorizedException();
    return this.bookings.getBooking(id, { sub: user.sub, role: user.role });
  }
}
