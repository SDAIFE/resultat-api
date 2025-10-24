import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GracePeriodService } from '../../common/services/grace-period.service';

@Injectable()
export class JwtWithGracePeriodGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private gracePeriodService: GracePeriodService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: 'Token d\'accès manquant',
        error: 'Unauthorized',
        detail: {
          code: 'TOKEN_MISSING',
          reason: 'Access token not provided',
          canRefresh: false
        }
      });
    }

    try {
      // Essayer de valider le token normalement
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      // Si le token est expiré, vérifier s'il est en grace period
      if (error.name === 'TokenExpiredError') {
        const graceToken = this.gracePeriodService.getGracePeriodToken(token);
        
        if (graceToken) {
          // Token en grace period, permettre l'accès
          const payload = this.jwtService.decode(token) as any;
          request.user = payload;
          return true;
        } else {
          // Token expiré et pas en grace period
          throw new UnauthorizedException({
            message: 'Token d\'accès expiré',
            error: 'Unauthorized',
            detail: {
              code: 'TOKEN_EXPIRED',
              reason: 'Access token has expired',
              canRefresh: true
            }
          });
        }
      }

      // Autres erreurs JWT (token invalide, malformé, etc.)
      throw new UnauthorizedException({
        message: 'Token d\'accès invalide',
        error: 'Unauthorized',
        detail: {
          code: 'TOKEN_INVALID',
          reason: 'Access token is invalid',
          canRefresh: false
        }
      });
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
