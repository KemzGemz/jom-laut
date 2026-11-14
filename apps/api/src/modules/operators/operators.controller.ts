import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { z } from '@jom-laut/validation';
import { OperatorsService } from './operators.service.js';
import { VerificationService } from './verification.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { CurrentUser } from '../../platform/security/decorators.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const registerOperatorSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().max(20).optional(),
  payoutDetails: z.record(z.unknown()).optional(),
});
type RegisterOperatorInput = z.infer<typeof registerOperatorSchema>;

const payoutSchema = z.object({ payoutDetails: z.record(z.unknown()) });
const memberSchema = z.object({ memberUserId: z.string().uuid() });
const verificationSchema = z.object({
  kind: z.string().trim().min(1).max(60),
  storageKey: z.string().trim().min(1).max(300),
});

@Controller('operators')
export class OperatorsController {
  constructor(
    private readonly operators: OperatorsService,
    private readonly verification: VerificationService,
  ) {}

  private uid(user: JwtPayload | undefined): string {
    if (!user) throw new UnauthorizedException();
    return user.sub;
  }

  @Post()
  register(
    @CurrentUser() user: JwtPayload | undefined,
    @Body(new ZodValidationPipe(registerOperatorSchema)) dto: RegisterOperatorInput,
  ) {
    return this.operators.register(this.uid(user), dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.operators.getOperator(id);
  }

  @Patch(':id/payout')
  updatePayout(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payoutSchema)) dto: { payoutDetails: Record<string, unknown> },
  ) {
    return this.operators.updatePayoutDetails(this.uid(user), id, dto.payoutDetails);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(memberSchema)) dto: { memberUserId: string },
  ) {
    return this.operators.addMember(this.uid(user), id, dto.memberUserId);
  }

  @Post(':id/verification')
  submitVerification(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(verificationSchema)) dto: { kind: string; storageKey: string },
  ) {
    return this.verification.submitDocument(id, dto.kind, dto.storageKey);
  }

  @Get(':id/verification')
  listVerification(@Param('id') id: string) {
    return this.verification.listDocuments(id);
  }
}
