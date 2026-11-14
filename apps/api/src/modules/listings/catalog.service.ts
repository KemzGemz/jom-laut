import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/** Reference data: region-agnostic location hierarchy, jetties, amenities (C1=D). */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listLocations(parentId?: string) {
    return this.prisma.location.findMany({
      where: parentId ? { parentId } : { parentId: null },
      select: { id: true, state: true, district: true, zone: true },
      orderBy: [{ state: 'asc' }, { district: 'asc' }],
    });
  }

  listJetties(locationId: string) {
    return this.prisma.jetty.findMany({
      where: { locationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  listAmenities() {
    return this.prisma.amenity.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }
}
