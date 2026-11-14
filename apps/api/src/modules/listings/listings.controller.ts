import { Body, Controller, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { ListingsService, type CreateListingInput } from './listings.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Roles } from '../../platform/security/decorators.js';
import { Role } from '@jom-laut/shared-types';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const createListingSchema = z.object({
  operatorId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  tripType: z.string().trim().min(1).max(40),
  jettyId: z.string().uuid().optional(),
  boatId: z.string().uuid().optional(),
  targetArea: z.string().trim().max(160).optional(),
  durationMinutes: z.number().int().positive().optional(),
  maxCapacity: z.number().int().min(1),
  bookingModel: z.enum(['INSTANT', 'REQUEST_TO_BOOK']),
  paymentMode: z.enum(['FULL', 'DEPOSIT']),
  depositBasisPoints: z.number().int().min(1).max(10_000).optional(),
  cancellationPolicyId: z.string().uuid().optional(),
  safetyRequirements: z.string().trim().max(2000).optional(),
});

const updateListingSchema = createListingSchema.partial().omit({ operatorId: true });
const imageSchema = z.object({ storageKey: z.string().min(1).max(300), sortOrder: z.number().int().min(0).optional() });
const packageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceSen: z.number().int().nonnegative(),
  capacity: z.number().int().min(1),
  inclusions: z.string().trim().max(2000).optional(),
  exclusions: z.string().trim().max(2000).optional(),
});

@Roles(Role.OPERATOR, Role.OPERATOR_MEMBER)
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  private uid(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(createListingSchema)) dto: CreateListingInput,
  ) {
    return this.listings.createListing(this.uid(user), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateListingSchema)) dto: Partial<CreateListingInput>,
  ) {
    return this.listings.updateListing(this.uid(user), id, dto);
  }

  @Post(':id/images')
  addImage(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(imageSchema)) dto: { storageKey: string; sortOrder?: number },
  ) {
    return this.listings.addImage(this.uid(user), id, dto.storageKey, dto.sortOrder ?? 0);
  }

  @Post(':id/packages')
  addPackage(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(packageSchema)) dto: { name: string; priceSen: number; capacity: number; inclusions?: string; exclusions?: string },
  ) {
    return this.listings.addPackage(this.uid(user), id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.listings.publish(this.uid(user), id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: JwtPayload | undefined, @Param('id') id: string) {
    return this.listings.unpublish(this.uid(user), id);
  }
}
