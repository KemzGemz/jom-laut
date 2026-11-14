import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, BookingModel, PaymentMode } from '@jom-laut/shared-types';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface CreateListingInput {
  operatorId: string;
  title: string;
  description: string;
  tripType: string;
  jettyId?: string;
  boatId?: string;
  targetArea?: string;
  durationMinutes?: number;
  maxCapacity: number;
  bookingModel: BookingModel;
  paymentMode: PaymentMode;
  depositBasisPoints?: number;
  cancellationPolicyId?: string;
  safetyRequirements?: string;
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a listing (US-18). Operator must own the profile AND be APPROVED. */
  async createListing(userId: string, input: CreateListingInput) {
    await this.assertApprovedOwner(userId, input.operatorId);
    return this.prisma.listing.create({
      data: {
        operatorId: input.operatorId,
        title: input.title,
        description: input.description,
        tripType: input.tripType,
        jettyId: input.jettyId ?? null,
        boatId: input.boatId ?? null,
        targetArea: input.targetArea ?? null,
        durationMinutes: input.durationMinutes ?? null,
        maxCapacity: input.maxCapacity,
        bookingModel: input.bookingModel,
        paymentMode: input.paymentMode,
        depositBasisPoints: input.depositBasisPoints ?? null,
        cancellationPolicyId: input.cancellationPolicyId ?? null,
        safetyRequirements: input.safetyRequirements ?? null,
        status: 'DRAFT',
      },
      select: { id: true, title: true, status: true },
    });
  }

  async updateListing(userId: string, listingId: string, patch: Partial<CreateListingInput>) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.tripType !== undefined ? { tripType: patch.tripType } : {}),
        ...(patch.maxCapacity !== undefined ? { maxCapacity: patch.maxCapacity } : {}),
        ...(patch.bookingModel !== undefined ? { bookingModel: patch.bookingModel } : {}),
        ...(patch.paymentMode !== undefined ? { paymentMode: patch.paymentMode } : {}),
        ...(patch.depositBasisPoints !== undefined ? { depositBasisPoints: patch.depositBasisPoints } : {}),
        ...(patch.cancellationPolicyId !== undefined ? { cancellationPolicyId: patch.cancellationPolicyId } : {}),
        ...(patch.safetyRequirements !== undefined ? { safetyRequirements: patch.safetyRequirements } : {}),
      },
      select: { id: true, title: true, status: true },
    });
  }

  async addImage(userId: string, listingId: string, storageKey: string, sortOrder = 0) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.listingImage.create({
      data: { listingId, storageKey, sortOrder },
      select: { id: true, sortOrder: true },
    });
  }

  /** Add a bookable package (US-18). Price in sen, non-negative (schema + validation). */
  async addPackage(userId: string, listingId: string, pkg: { name: string; priceSen: number; capacity: number; inclusions?: string; exclusions?: string }) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.package.create({
      data: {
        listingId,
        name: pkg.name,
        priceSen: pkg.priceSen,
        capacity: pkg.capacity,
        inclusions: pkg.inclusions ?? null,
        exclusions: pkg.exclusions ?? null,
      },
      select: { id: true, name: true, priceSen: true, capacity: true },
    });
  }

  /** Publish (US-20). If moderation is enabled the listing enters PENDING_MODERATION. */
  async publish(userId: string, listingId: string, moderationEnabled = false) {
    await this.assertListingOwner(userId, listingId);
    const status = moderationEnabled ? 'PENDING_MODERATION' : 'PUBLISHED';
    return this.prisma.listing.update({ where: { id: listingId }, data: { status }, select: { id: true, status: true } });
  }

  async unpublish(userId: string, listingId: string) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'UNPUBLISHED' }, select: { id: true, status: true } });
  }

  /** Admin moderation (US-28). */
  async moderate(listingId: string, decision: 'APPROVED' | 'REJECTED') {
    const status = decision === 'APPROVED' ? 'PUBLISHED' : 'REJECTED';
    return this.prisma.listing.update({ where: { id: listingId }, data: { status }, select: { id: true, status: true } });
  }

  private async assertApprovedOwner(userId: string, operatorId: string): Promise<void> {
    const [membership, operator] = await Promise.all([
      this.prisma.operatorMember.findFirst({ where: { operatorId, userId }, select: { id: true } }),
      this.prisma.operatorProfile.findUnique({ where: { id: operatorId }, select: { approvalStatus: true } }),
    ]);
    if (!membership) throw new ForbiddenException({ code: 'NOT_OPERATOR_MEMBER', message: 'Not a member of this operator' });
    if (operator?.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException({ code: 'OPERATOR_NOT_APPROVED', message: 'Operator is not approved' });
    }
  }

  private async assertListingOwner(userId: string, listingId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { operatorId: true } });
    if (!listing) throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Listing not found' });
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId: listing.operatorId, userId },
      select: { id: true, role: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'NOT_LISTING_OWNER', message: 'Not permitted for this listing' });
  }
}
