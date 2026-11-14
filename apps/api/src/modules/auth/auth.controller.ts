import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { loginSchema, registerSchema, z } from '@jom-laut/validation';
import type { LoginInput, RegisterInput } from '@jom-laut/validation';
import { AuthService, type AuthResult } from './auth.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { Public, CurrentUser } from '../../platform/security/decorators.js';
import { RateLimitGuard } from '../../platform/security/rate-limit.guard.js';
import type { JwtPayload } from '../../platform/crypto/token.service.js';

const refreshSchema = z.object({ refreshToken: z.string().min(10) });
type RefreshInput = z.infer<typeof refreshSchema>;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput): Promise<{ accessToken: string }> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Returns the current authenticated principal (protected by the global AuthGuard). */
  @Get('me')
  me(@CurrentUser() user: JwtPayload | undefined): { sub: string; role: string } {
    return { sub: user?.sub ?? '', role: user?.role ?? '' };
  }
}
