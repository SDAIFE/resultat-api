import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  success?: boolean;
}

/**
 * Service d'audit pour la traçabilité des actions sensibles
 * 
 * Conformité RGPD : Obligation de tracer les accès et modifications
 * aux données personnelles
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre une action dans les logs d'audit
   * 
   * @param data - Données de l'action à logger
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent ? data.userAgent.substring(0, 500) : null, // Limiter à 500 caractères
          details: data.details ? JSON.stringify(data.details) : null,
          success: data.success ?? true,
        },
      });
    } catch (error) {
      // Ne jamais faire échouer une action à cause du logging
      console.error('❌ Erreur lors de l\'enregistrement du log d\'audit:', error);
    }
  }

  /**
   * Récupère les logs d'audit avec filtres
   * 
   * @param filters - Critères de filtrage
   * @returns Liste des logs et métadonnées de pagination
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, startDate, endDate, ...where } = filters;

    const whereClause: any = { ...where };

    // Filtre par dates
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: {
                select: {
                  code: true,
                  name: true,
                }
              }
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupère les statistiques des logs d'audit
   */
  async getStats(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: any = {};

    if (filters?.startDate || filters?.endDate) {
      whereClause.timestamp = {};
      if (filters.startDate) whereClause.timestamp.gte = filters.startDate;
      if (filters.endDate) whereClause.timestamp.lte = filters.endDate;
    }

    const [
      totalLogs,
      successLogs,
      failedLogs,
      actionsByType,
      topUsers,
    ] = await Promise.all([
      // Total des logs
      this.prisma.auditLog.count({ where: whereClause }),
      
      // Logs réussis
      this.prisma.auditLog.count({ 
        where: { ...whereClause, success: true } 
      }),
      
      // Logs échoués
      this.prisma.auditLog.count({ 
        where: { ...whereClause, success: false } 
      }),
      
      // Grouper par type d'action
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      
      // Top utilisateurs actifs
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...whereClause, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      successLogs,
      failedLogs,
      successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0,
      actionsByType: actionsByType.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
      topUsers: await Promise.all(
        topUsers.map(async (u) => {
          const user = await this.prisma.user.findUnique({
            where: { id: u.userId! },
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          });
          return {
            userId: u.userId,
            user: user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Utilisateur supprimé',
            count: u._count.userId,
          };
        })
      ),
    };
  }

  /**
   * Nettoie les anciens logs (politique de rétention)
   * 
   * @param daysToKeep - Nombre de jours à conserver (défaut: 365 pour RGPD)
   */
  async cleanOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    console.log(`🗑️ ${result.count} logs d'audit supprimés (> ${daysToKeep} jours)`);
    return result.count;
  }
}

