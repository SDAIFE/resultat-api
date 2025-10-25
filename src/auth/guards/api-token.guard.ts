import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard pour l'authentification par token API statique
 * Utilisé pour les applications publiques qui n'ont pas besoin d'authentification utilisateur
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    console.log('🔍 ApiTokenGuard - Token reçu:', token ? `${token.substring(0, 20)}...` : 'AUCUN');

    if (!token) {
      console.log('❌ ApiTokenGuard - Token manquant');
      throw new UnauthorizedException({
        message: 'Token API manquant',
        error: 'Unauthorized',
        detail: {
          code: 'API_TOKEN_MISSING',
          reason: 'API token not provided',
          hint: 'Include API token in Authorization header: Bearer <token>'
        }
      });
    }

    const validToken = this.configService.get<string>('PUBLIC_APP_API_TOKEN');
    console.log('🔍 ApiTokenGuard - Token configuré:', validToken ? `${validToken.substring(0, 20)}...` : 'AUCUN');
    
    if (!validToken) {
      console.log('❌ ApiTokenGuard - Configuration manquante');
      throw new UnauthorizedException({
        message: 'Configuration API manquante',
        error: 'Unauthorized',
        detail: {
          code: 'API_CONFIG_MISSING',
          reason: 'PUBLIC_APP_API_TOKEN not configured on server'
        }
      });
    }

    if (token !== validToken) {
      console.log('❌ ApiTokenGuard - Token invalide');
      throw new UnauthorizedException({
        message: 'Token API invalide',
        error: 'Unauthorized',
        detail: {
          code: 'API_TOKEN_INVALID',
          reason: 'Invalid API token provided'
        }
      });
    }

    console.log('✅ ApiTokenGuard - Token valide');
    // Ajouter des informations sur l'application publique dans la requête
    request.publicApp = {
      authenticated: true,
      tokenType: 'API_TOKEN',
      timestamp: new Date().toISOString()
    };

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
