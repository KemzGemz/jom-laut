import { Body, Controller, Get, Patch, Query, UnauthorizedException } from '@nestjs/common';
import { paginationSchema, z } from '@jom-laut/validation';
import type { Pagination } from '@jom-laut/validation';
import { UsersService } from './users.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(20).optional(),
  emergencyContact: z.string().trim().max(120).optional(),
});
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private requireUser(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload | undefined) {
    return this.users.getProfile(this.requireUser(user));
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileInput,
  ) {
    return this.users.updateProfile(this.requireUser(user), dto);
  }

  @Get('bookings')
  bookings(
    @CurrentUser() user: JwtPayload | undefined,
    @Query(new ZodValidationPipe(paginationSchema)) page: Pagination,
  ) {
    return this.users.getBookingHistory(this.requireUser(user), page);
  }
}
