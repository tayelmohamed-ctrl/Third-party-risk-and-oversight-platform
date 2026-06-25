import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * STUBBED AUTH.  AUTH_MODE=stub trusts x-user-id / x-user-name / x-user-role
 * headers (dev only). Defaults to a demo supervisor so the API runs out of the box.
 *
 * TODO (production): set AUTH_MODE=oidc and replace the stub branch with real
 * JWT/OIDC verification (Auth0 / Clerk / Keycloak). Map IdP claims -> AuthUser.
 * This is the single seam to change; nothing else in the app needs to.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const mode = this.config.get('AUTH_MODE') ?? 'stub';

    if (mode === 'stub') {
      req.user = {
        id: req.headers['x-user-id'] || 'u-sup',
        name: req.headers['x-user-name'] || 'Supervisor',
        role: (req.headers['x-user-role'] || 'SUPERVISOR').toUpperCase(),
      };
      return true;
    }

    // TODO: verify Bearer JWT against OIDC_ISSUER/OIDC_AUDIENCE and set req.user.
    throw new UnauthorizedException('OIDC not configured yet (set AUTH_MODE=stub for dev).');
  }
}
