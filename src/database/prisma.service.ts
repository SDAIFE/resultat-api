import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MonitoringService } from '../common/services/monitoring.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private monitoringService: MonitoringService;

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        'info',
        'warn',
        'error',
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Écouter les événements de requête pour le monitoring
    (this as any).$on('query', (e: any) => {
      if (this.monitoringService) {
        this.monitoringService.recordQuery(e.query, e.duration);
      }
    });
  }

  setMonitoringService(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🔗 Connexion à la base de données SQL Server établie');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Connexion à la base de données fermée');
  }

  // Méthodes utilitaires pour les transactions
  async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  // Méthode pour nettoyer les données de test
  async cleanDatabase() {
    const tablenames = await this.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'dbo' AND table_name != '_prisma_migrations'
    `;

    const tables = tablenames
      .map(({ table_name }) => table_name)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"${name}"`)
      .join(', ');

    try {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.log({ error });
    }
  }
}
