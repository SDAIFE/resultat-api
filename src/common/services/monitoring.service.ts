import { Injectable } from '@nestjs/common';

export interface QueryMetrics {
  query: string;
  count: number;
  totalTime: number;
  averageTime: number;
  lastExecuted: Date;
}

@Injectable()
export class MonitoringService {
  private queryMetrics = new Map<string, QueryMetrics>();
  private slowQueryThreshold = 1000; // 1 seconde

  /**
   * Enregistrer une métrique de requête
   */
  recordQuery(query: string, executionTime: number): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existing = this.queryMetrics.get(normalizedQuery);

    if (existing) {
      existing.count++;
      existing.totalTime += executionTime;
      existing.averageTime = existing.totalTime / existing.count;
      existing.lastExecuted = new Date();
    } else {
      this.queryMetrics.set(normalizedQuery, {
        query: normalizedQuery,
        count: 1,
        totalTime: executionTime,
        averageTime: executionTime,
        lastExecuted: new Date(),
      });
    }

    // Alerter si la requête est lente
    if (executionTime > this.slowQueryThreshold) {
      console.warn(`🐌 Requête lente détectée: ${normalizedQuery} (${executionTime}ms)`);
    }
  }

  /**
   * Obtenir les statistiques des requêtes
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: QueryMetrics[];
    mostFrequent: QueryMetrics[];
    averageExecutionTime: number;
  } {
    const queries = Array.from(this.queryMetrics.values());
    const totalQueries = queries.reduce((sum, q) => sum + q.count, 0);
    const slowQueries = queries.filter(q => q.averageTime > this.slowQueryThreshold);
    const mostFrequent = queries
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const averageExecutionTime = queries.length > 0 
      ? queries.reduce((sum, q) => sum + q.averageTime, 0) / queries.length 
      : 0;

    return {
      totalQueries,
      slowQueries,
      mostFrequent,
      averageExecutionTime,
    };
  }

  /**
   * Réinitialiser les métriques
   */
  resetMetrics(): void {
    this.queryMetrics.clear();
  }

  /**
   * Normaliser une requête pour le regroupement
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/"[^"]*"/g, '"?"')
      .trim();
  }

  /**
   * Obtenir un rapport de performance
   */
  getPerformanceReport(): string {
    const stats = this.getQueryStats();
    
    return `
📊 RAPPORT DE PERFORMANCE
========================
Total des requêtes: ${stats.totalQueries}
Temps d'exécution moyen: ${stats.averageExecutionTime.toFixed(2)}ms
Requêtes lentes: ${stats.slowQueries.length}

🔍 TOP 5 DES REQUÊTES LES PLUS FRÉQUENTES:
${stats.mostFrequent.slice(0, 5).map((q, i) => 
  `${i + 1}. ${q.query} (${q.count}x, ${q.averageTime.toFixed(2)}ms)`
).join('\n')}

⚠️  REQUÊTES LENTES:
${stats.slowQueries.slice(0, 3).map((q, i) => 
  `${i + 1}. ${q.query} (${q.averageTime.toFixed(2)}ms)`
).join('\n')}
    `.trim();
  }
}
