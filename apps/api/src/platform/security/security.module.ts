import { Global, Module } from '@nestjs/common';
import { TokenService } from '../crypto/token.service.js';
import { SecretBox, SECRET_BOX } from '../crypto/secret-box.js';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';

/**
 * Security primitives shared across all modules (SECURITY-08/11/12).
 * Guards are registered globally in PlatformModule via APP_GUARD.
 */
@Global()
@Module({
  providers: [
    TokenService,
    AuthGuard,
    RolesGuard,
    RateLimitGuard,
    {
      provide: SECRET_BOX,
      useFactory: (config: AppConfig): SecretBox => new SecretBox(config.PAYOUT_ENC_KEY ?? config.JWT_SECRET),
      inject: [APP_CONFIG],
    },
  ],
  exports: [TokenService, AuthGuard, RolesGuard, RateLimitGuard, SECRET_BOX],
})
export class SecurityModule {}
