import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@jom-laut/shared-types';
import type { JwtPayload } from '../crypto/token.service.js';

/** Marks a route as public (bypasses AuthGuard). Everything is protected by default. */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the given roles (RBAC, SECURITY-08). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated principal into a handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
  const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
  return request.user;
});
