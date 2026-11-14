import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators.js';
import { TokenService, type JwtPayload } from '../crypto/token.service.js';

/**
 * Deny-by-default authentication (SECURITY-08). Every route requires a valid
 * bearer token unless explicitly marked @Public(). Tokens are validated
 * server-side on every request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: JwtPayload }>();
    const header = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      request.user = this.tokens.verify(header.slice('Bearer '.length));
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
