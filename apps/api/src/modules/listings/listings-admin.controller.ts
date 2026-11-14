import { Body, Controller, Param, Post } from '@nestjs/common';
import { Role } from '@jom-laut/shared-types';
import { z } from '@jom-laut/validation';
import { ListingsService } from './listings.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { Roles } from '../../platform/security/decorators.js';

const moderateSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) });

/** Admin listing moderation (US-28). */
@Roles(Role.ADMIN)
@Controller('admin/listings')
export class ListingsAdminController {
  constructor(private readonly listings: ListingsService) {}

  @Post(':id/moderate')
  moderate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moderateSchema)) dto: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.listings.moderate(id, dto.decision);
  }
}
