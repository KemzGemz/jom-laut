import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@jom-laut/shared-types';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SecretBox, SECRET_BOX } from '../../platform/crypto/secret-box.js';
import { EventBus } from '../../platform/events/event-bus.js';

export interface OperatorRegistrationInput {
  displayName: string;
  legalName?: string;
  contactEmail: string;
  contactPhone?: string;
  payoutDetails?: Record<string, unknown>;
}

@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SECRET_BOX) private readonly secretBox: SecretBox,
    private readonly events: EventBus,
  ) {}

  /** Register an operator profile owned by the current user (US-16). Status starts PENDING. */
  async register(userId: string, input: OperatorRegistrationInput) {
    const payoutDetailsEnc = input.payoutDetails
      ? this.secretBox.encrypt(JSON.stringify(input.payoutDetails))
      : null;

    return this.prisma.$transaction(async (tx) => {
      const operator = await tx.operatorProfile.create({
        data: {
          displayName: input.displayName,
          legalName: input.legalName ?? null,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone ?? null,
          payoutDetailsEnc,
          members: { create: { userId, role: Role.OPERATOR } },
        },
        select: { id: true, displayName: true, approvalStatus: true, createdAt: true },
      });
      return operator;
    });
  }

  async getOperator(operatorId: string) {
    const operator = await this.prisma.operatorProfile.findUnique({
      where: { id: operatorId },
      select: {
        id: true,
        displayName: true,
        legalName: true,
        contactEmail: true,
        contactPhone: true,
        approvalStatus: true,
        createdAt: true,
      },
    });
    if (!operator) throw new NotFoundException({ code: 'OPERATOR_NOT_FOUND', message: 'Operator not found' });
    return operator;
  }

  /** Only the operator owner may update payout details; encrypted at rest; never returned. */
  async updatePayoutDetails(userId: string, operatorId: string, payoutDetails: Record<string, unknown>) {
    await this.assertOwner(userId, operatorId);
    await this.prisma.operatorProfile.update({
      where: { id: operatorId },
      data: { payoutDetailsEnc: this.secretBox.encrypt(JSON.stringify(payoutDetails)) },
    });
    return { updated: true };
  }

  async addMember(userId: string, operatorId: string, memberUserId: string) {
    await this.assertOwner(userId, operatorId);
    await this.prisma.operatorMember.create({
      data: { operatorId, userId: memberUserId, role: Role.OPERATOR_MEMBER },
    });
    return { added: true };
  }

  /** Admin approves/rejects an operator (US-26). Audited. */
  async setApprovalStatus(adminId: string, operatorId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const operator = await this.prisma.operatorProfile.update({
      where: { id: operatorId },
      data: { approvalStatus: status },
      select: { id: true, approvalStatus: true },
    });
    await this.writeAudit(adminId, `OPERATOR_${status}`, operatorId, reason);
    await this.events.publish({
      type: status === 'APPROVED' ? 'OperatorApproved' : 'OperatorRejected',
      payload: { operatorId, reason },
    });
    return operator;
  }

  /** Admin suspends/reactivates an operator (US-27). Audited. */
  async setSuspension(adminId: string, operatorId: string, suspended: boolean, reason: string) {
    const operator = await this.prisma.operatorProfile.update({
      where: { id: operatorId },
      data: { approvalStatus: suspended ? 'SUSPENDED' : 'APPROVED' },
      select: { id: true, approvalStatus: true },
    });
    await this.writeAudit(adminId, suspended ? 'OPERATOR_SUSPENDED' : 'OPERATOR_REINSTATED', operatorId, reason);
    return operator;
  }

  private async assertOwner(userId: string, operatorId: string): Promise<void> {
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId, userId, role: Role.OPERATOR },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'NOT_OPERATOR_OWNER', message: 'Not the operator owner' });
  }

  private async writeAudit(actorId: string, action: string, targetId: string, reason?: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetType: 'OperatorProfile', targetId, reason: reason ?? null },
    });
  }
}
