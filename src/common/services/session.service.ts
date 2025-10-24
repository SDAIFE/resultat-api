import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Vérifier si une session est active (pas d'inactivité prolongée)
   */
  async isSessionActive(refreshToken: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return false;
    }

    // Vérifier l'expiration absolue
    if (session.expiresAt < new Date()) {
      return false;
    }

    // Vérifier l'inactivité (sliding session)
    const inactivityTimeout = this.getInactivityTimeout();
    const lastActivityThreshold = new Date();
    lastActivityThreshold.setHours(lastActivityThreshold.getHours() - inactivityTimeout);

    return session.lastActivity > lastActivityThreshold;
  }

  /**
   * Nettoyer les sessions expirées ou inactives
   */
  async cleanupExpiredSessions(): Promise<number> {
    const inactivityTimeout = this.getInactivityTimeout();
    const inactivityThreshold = new Date();
    inactivityThreshold.setHours(inactivityThreshold.getHours() - inactivityTimeout);

    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          // Sessions expirées
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          // Sessions inactives
          {
            lastActivity: {
              lt: inactivityThreshold,
            },
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Obtenir le timeout d'inactivité en heures depuis la configuration
   */
  private getInactivityTimeout(): number {
    const configValue = this.configService.get<string>('SESSION_INACTIVITY_TIMEOUT_HOURS') || '4';
    return parseInt(configValue);
  }

  /**
   * Mettre à jour l'activité d'une session spécifique
   */
  async updateSessionActivity(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        refreshToken,
        expiresAt: {
          gt: new Date(), // Seulement si la session n'est pas expirée
        },
      },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Obtenir les statistiques des sessions
   */
  async getSessionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    inactive: number;
  }> {
    const now = new Date();
    const inactivityTimeout = this.getInactivityTimeout();
    const inactivityThreshold = new Date();
    inactivityThreshold.setHours(inactivityThreshold.getHours() - inactivityTimeout);

    const [total, active, expired, inactive] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({
        where: {
          expiresAt: { gt: now },
          lastActivity: { gt: inactivityThreshold },
        },
      }),
      this.prisma.session.count({
        where: {
          expiresAt: { lt: now },
        },
      }),
      this.prisma.session.count({
        where: {
          expiresAt: { gt: now },
          lastActivity: { lt: inactivityThreshold },
        },
      }),
    ]);

    return { total, active, expired, inactive };
  }
}
