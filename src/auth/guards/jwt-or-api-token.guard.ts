import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTokenGuard } from './api-token.guard';

/**
 * Guard composite qui permet l'authentification soit par JWT soit par token API
 * Utilisé pour les routes qui doivent être accessibles aux utilisateurs authentifiés ET aux applications publiques
 */
@Injectable()
export class JwtOrApiTokenGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private apiTokenGuard: ApiTokenGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Essayer d'abord l'authentification JWT
    try {
      const jwtResult = await this.jwtAuthGuard.canActivate(context);
      if (jwtResult) {
        return true;
      }
    } catch (error) {
      // JWT a échoué, continuer avec le token API
      console.log('🔍 JWT Auth failed, trying API token...');
    }

    // Si JWT échoue, essayer le token API
    try {
      const apiResult = await this.apiTokenGuard.canActivate(context);
      if (apiResult) {
        console.log('✅ API Token authentication successful');
        return true;
      }
    } catch (error) {
      console.log('❌ API Token authentication failed:', error.message);
      // Les deux ont échoué, lancer l'erreur du token API (plus explicite)
      throw error;
    }

    return false;
  }
}
