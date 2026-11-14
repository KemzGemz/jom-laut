import { Injectable, NotFoundException } from '@nestjs/common';
import type { Pagination } from '@jom-laut/validation';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        customerProfile: { select: { emergencyContact: true } },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return user;
  }

  async updateProfile(userId: string, patch: { fullName?: string; phone?: string; emergencyContact?: string }) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.emergencyContact !== undefined
          ? { customerProfile: { update: { emergencyContact: patch.emergencyContact } } }
          : {}),
      },
    });
    return this.getProfile(userId);
  }

  /** Booking history for the current customer (US-14). Ownership enforced by userId filter. */
  async getBookingHistory(userId: string, page: Pagination) {
    const where = { customerId: userId };
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        select: {
          id: true,
          reference: true,
          status: true,
          totalSen: true,
          currency: true,
          createdAt: true,
          listing: { select: { title: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }
}
