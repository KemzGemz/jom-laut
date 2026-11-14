import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from '@jom-laut/shared-types';
import type { RegisterInput, LoginInput } from '@jom-laut/validation';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { TokenService } from '../../platform/crypto/token.service.js';
import { hashPassword, verifyPassword } from '../../platform/crypto/password.js';

export interface AuthResult {
  user: { id: string; email: string; role: Role; fullName: string };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Register a new customer (US-1). Operators onboard via the operators module (U3). */
  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role: Role.CUSTOMER,
          customerProfile: { create: {} },
        },
      });
      return this.buildResult(user.id, user.email, user.role as Role, user.fullName);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Do not reveal whether the email exists beyond a generic conflict.
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Registration could not be completed' });
      }
      throw err;
    }
  }

  /** Authenticate a user (US-2). Generic error on any failure to avoid user enumeration. */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
    if (!user || !ok || !user.isActive) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    return this.buildResult(user.id, user.email, user.role as Role, user.fullName);
  }

  /** Exchange a valid refresh token for a fresh access token (US-2). */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.tokens.verify(refreshToken);
      const accessToken = this.tokens.sign({
        sub: payload.sub,
        role: payload.role,
        ...(payload.operatorId ? { operatorId: payload.operatorId } : {}),
      });
      return { accessToken };
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' });
    }
  }

  private buildResult(id: string, email: string, role: Role, fullName: string): AuthResult {
    const accessToken = this.tokens.sign({ sub: id, role });
    const refreshToken = this.tokens.sign({ sub: id, role }, 60 * 60 * 24 * 14);
    return { user: { id, email, role, fullName }, accessToken, refreshToken };
  }
}
