import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/**
 * Operator verification documents (US-17). Files are uploaded to object storage
 * (validated + scanned) and referenced here by storage key. Admin reviews them.
 */
@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async submitDocument(operatorId: string, kind: string, storageKey: string) {
    return this.prisma.verificationDocument.create({
      data: { operatorId, kind, storageKey, status: 'PENDING' },
      select: { id: true, kind: true, status: true, createdAt: true },
    });
  }

  async listDocuments(operatorId: string) {
    return this.prisma.verificationDocument.findMany({
      where: { operatorId },
      select: { id: true, kind: true, status: true, reviewNote: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewDocument(reviewerId: string, docId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    return this.prisma.verificationDocument.update({
      where: { id: docId },
      data: { status: decision, reviewedBy: reviewerId, reviewNote: note ?? null },
      select: { id: true, status: true },
    });
  }
}
