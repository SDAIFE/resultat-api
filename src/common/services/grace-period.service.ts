import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

export interface GracePeriodToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

@Injectable()
export class GracePeriodService {
  constructor(
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}

  /**
   * Ajouter un token en grace period
   */
  addTokenToGracePeriod(token: string, userId: string): void {
    const gracePeriodSeconds = this.getGracePeriodSeconds();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + gracePeriodSeconds);

    const graceToken: GracePeriodToken = {
      token,
      expiresAt,
      userId,
    };

    const cacheKey = `grace:${token}`;
    this.cacheService.set(cacheKey, graceToken, gracePeriodSeconds * 1000);
  }

  /**
   * Vérifier si un token est en grace period
   */
  isTokenInGracePeriod(token: string): boolean {
    const cacheKey = `grace:${token}`;
    const graceToken = this.cacheService.get<GracePeriodToken>(cacheKey);
    
    if (!graceToken) {
      return false;
    }

    // Vérifier si la grace period n'est pas expirée
    if (graceToken.expiresAt < new Date()) {
      this.cacheService.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Obtenir les informations d'un token en grace period
   */
  getGracePeriodToken(token: string): GracePeriodToken | null {
    const cacheKey = `grace:${token}`;
    const graceToken = this.cacheService.get<GracePeriodToken>(cacheKey);
    
    if (!graceToken || graceToken.expiresAt < new Date()) {
      if (graceToken) {
        this.cacheService.delete(cacheKey);
      }
      return null;
    }

    return graceToken;
  }

  /**
   * Supprimer un token de la grace period
   */
  removeTokenFromGracePeriod(token: string): void {
    const cacheKey = `grace:${token}`;
    this.cacheService.delete(cacheKey);
  }

  /**
   * Nettoyer tous les tokens expirés de la grace period
   */
  cleanupExpiredGraceTokens(): number {
    // Note: Le cache service gère automatiquement l'expiration
    // Cette méthode est ici pour la cohérence de l'API
    return 0;
  }

  /**
   * Obtenir la durée de la grace period en secondes depuis la configuration
   */
  private getGracePeriodSeconds(): number {
    const configValue = this.configService.get<string>('TOKEN_GRACE_PERIOD_SECONDS') || '60';
    return parseInt(configValue);
  }

  /**
   * Obtenir les statistiques de la grace period
   */
  getGracePeriodStats(): { activeTokens: number; gracePeriodSeconds: number } {
    // Note: Le cache service ne fournit pas de méthode pour compter les clés
    // Cette méthode est ici pour la cohérence de l'API
    return {
      activeTokens: 0,
      gracePeriodSeconds: this.getGracePeriodSeconds(),
    };
  }
}
