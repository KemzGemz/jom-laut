import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../security/decorators.js';

/**
 * Health checks (RESILIENCY-06): shallow (process liveness) and
 * deep (dependency readiness — database).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  shallow(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Public()
  @Get('deep')
  async deep(): Promise<{ status: string; checks: Record<string, string> }> {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'down';
    }
    const healthy = Object.values(checks).every((v) => v === 'ok');
    return { status: healthy ? 'ok' : 'degraded', checks };
  }
}
