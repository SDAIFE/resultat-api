import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { MonitoringService } from '../common/services/monitoring.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private monitoringService: MonitoringService;

  constructor() {
    // 🔒 SÉCURITÉ : Configuration des logs selon l'environnement
    const logLevels: Array<Prisma.LogLevel | Prisma.LogDefinition> = process.env.NODE_ENV === 'production' 
      ? ['error'] // En production : uniquement les erreurs
      : [
          { emit: 'event', level: 'query' },
          'info',
          'warn',
          'error',
        ] as Array<Prisma.LogLevel | Prisma.LogDefinition>;

    const url = process.env.DATABASE_URL;
    
    // Ajouter les paramètres de pool si nécessaire
    const enhancedUrl = url && !url.includes('connectionLimit') 
      ? `${url};connectionLimit=50;poolTimeout=60000` 
      : url;

    super({
      log: logLevels,
      datasources: {
        db: {
          url: enhancedUrl,
        },
      },
    });

    // Écouter les événements de requête pour le monitoring (uniquement en dev)
    if (process.env.NODE_ENV !== 'production') {
      (this as any).$on('query', (e: any) => {
        if (this.monitoringService) {
          // 🔒 SÉCURITÉ : Sanitiser les données sensibles avant logging
          const sanitizedQuery = this.sanitizeQuery(e.query);
          this.monitoringService.recordQuery(sanitizedQuery, e.duration);
        }
      });
    }
  }

  /**
   * 🔒 SÉCURITÉ : Sanitiser les requêtes SQL pour masquer les données sensibles
   */
  private sanitizeQuery(query: string): string {
    if (!query) return query;
    
    return query
      // Masquer les mots de passe
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      // Masquer les emails dans les INSERT/UPDATE
      .replace(/(email\s*=\s*')([^']*)(')/, '$1***@***.***$3')
      // Masquer les tokens
      .replace(/(refreshToken\s*=\s*')([^']*)(')/, '$1***TOKEN***$3')
      .replace(/(accessToken\s*=\s*')([^']*)(')/, '$1***TOKEN***$3');
  }

  setMonitoringService(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }

  async onModuleInit() {
    try {
      // Configuration du timeout avant connexion
      await this.$connect();
      console.log('🔗 Connexion à la base de données SQL Server établie');
    } catch (error) {
      if (error instanceof Error && error.message.includes('pool')) {
        console.error('⏱️ Timeout de connexion au pool détecté, réessayant...');
        // Retry après un court délai
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.$connect();
        console.log('🔗 Connexion à la base de données SQL Server établie (retry)');
      } else {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Connexion à la base de données fermée');
  }

  // Méthodes utilitaires pour les transactions
  async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Exécuter une requête avec timeout personnalisé
   */
  async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  // Méthode pour nettoyer les données de test
  async cleanDatabase() {
    const tablenames = await this.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'dbo' AND table_name != '_prisma_migrations'
    `;

    // Valider strictement les noms de tables pour éviter l'injection SQL
    const validTableNames = tablenames
      .map(({ table_name }) => table_name)
      .filter((name) => name !== '_prisma_migrations')
      .filter((name) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)); // Validation stricte

    // Tronquer chaque table individuellement de manière sécurisée
    try {
      for (const tableName of validTableNames) {
        // Utilisation de Prisma.sql pour échappement sécurisé
        await this.$executeRaw`TRUNCATE TABLE ${Prisma.raw(`[${tableName}]`)}`;
      }
    } catch (error) {
      console.log({ error });
    }
  }
}
