import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { Role } from '@jom-laut/shared-types';
import { AvailabilityService } from './availability.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const scheduleSchema = z.object({ name: z.string().trim().max(120).optional() });
const slotSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.number().int().min(1),
  isExclusive: z.boolean().optional(),
});
const blockDateSchema = z.object({ date: z.coerce.date(), reason: z.string().trim().max(200).optional() });
const calendarQuerySchema = z.object({ from: z.coerce.date(), to: z.coerce.date() });

@Roles(Role.OPERATOR, Role.OPERATOR_MEMBER)
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  private uid(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post('listings/:listingId/schedules')
  createSchedule(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('listingId') listingId: string,
    @Body(new ZodValidationPipe(scheduleSchema)) dto: { name?: string },
  ) {
    return this.availability.createSchedule(this.uid(user), listingId, dto.name);
  }

  @Post('schedules/:scheduleId/slots')
  addSlot(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('scheduleId') scheduleId: string,
    @Body(new ZodValidationPipe(slotSchema)) dto: { startsAt: Date; endsAt: Date; capacity: number; isExclusive?: boolean },
  ) {
    return this.availability.addSlot(this.uid(user), scheduleId, dto);
  }

  @Post('listings/:listingId/blocked-dates')
  blockDate(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('listingId') listingId: string,
    @Body(new ZodValidationPipe(blockDateSchema)) dto: { date: Date; reason?: string },
  ) {
    return this.availability.blockDate(this.uid(user), listingId, dto.date, dto.reason);
  }

  @Post('slots/:slotId/sold-out')
  markSoldOut(@CurrentUser() user: JwtPayload | undefined, @Param('slotId') slotId: string) {
    return this.availability.markSoldOut(this.uid(user), slotId);
  }

  @Get('listings/:listingId/calendar')
  calendar(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('listingId') listingId: string,
    @Query(new ZodValidationPipe(calendarQuerySchema)) q: { from: Date; to: Date },
  ) {
    return this.availability.getCalendar(this.uid(user), listingId, q.from, q.to);
  }
}
