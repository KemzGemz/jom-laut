import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ListingSearch } from '@jom-laut/validation';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/** Customer-facing discovery (US-6/7/8). Reads only PUBLISHED listings. */
@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: ListingSearch) {
    const where: Prisma.ListingWhereInput = { status: 'PUBLISHED' };

    if (query.tripType) where.tripType = query.tripType;
    if (query.jettyId) where.jettyId = query.jettyId;
    if (query.state || query.district) {
      where.jetty = {
        location: {
          ...(query.state ? { state: query.state } : {}),
          ...(query.district ? { district: query.district } : {}),
        },
      };
    }
    if (query.minCapacity) where.maxCapacity = { gte: query.minCapacity };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.packages = {
        some: {
          priceSen: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        },
      };
    }
    if (query.date) {
      const dayStart = new Date(`${query.date}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      where.schedules = {
        some: { slots: { some: { startsAt: { gte: dayStart, lt: dayEnd }, soldOut: false } } },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
          tripType: true,
          maxCapacity: true,
          operator: { select: { displayName: true, approvalStatus: true } },
          jetty: { select: { name: true, location: { select: { state: true, district: true } } } },
          packages: { select: { priceSen: true }, orderBy: { priceSen: 'asc' }, take: 1 },
          images: { select: { storageKey: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Full listing detail (US-8). Only PUBLISHED listings are visible. */
  async getDetail(listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        description: true,
        tripType: true,
        targetArea: true,
        durationMinutes: true,
        maxCapacity: true,
        bookingModel: true,
        paymentMode: true,
        depositBasisPoints: true,
        safetyRequirements: true,
        operator: { select: { displayName: true, approvalStatus: true } },
        jetty: { select: { name: true, location: { select: { state: true, district: true } } } },
        packages: { select: { id: true, name: true, priceSen: true, capacity: true, inclusions: true, exclusions: true } },
        images: { select: { storageKey: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
        cancellationPolicy: { select: { name: true, tiers: true } },
      },
    });
    if (!listing) throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Listing not available' });
    return listing;
  }
}
