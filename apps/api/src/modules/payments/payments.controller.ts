import { Body, Controller, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from '@jom-laut/validation';
import { Role } from '@jom-laut/shared-types';
import { PaymentsService } from './payments.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser, Public, Roles } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const initiateSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(['MANUAL_TRANSFER', 'FPX', 'CARD', 'EWALLET']),
});

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  initiate(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(initiateSchema)) dto: { bookingId: string; method: 'MANUAL_TRANSFER' | 'FPX' | 'CARD' | 'EWALLET' },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.payments.initiatePayment(user.sub, dto.bookingId, dto.method, idempotencyKey);
  }
}

/** Provider webhook endpoint (public; authenticated by signature, not by token). */
@Public()
@Controller('webhooks/payments')
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':provider')
  handle(@Req() req: RawBodyRequest<FastifyRequest>, @Headers('x-webhook-signature') signature?: string) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    return this.payments.handleWebhook(raw, signature ?? '');
  }
}
