import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🚀 SCRIPT DE TEST DE PERFORMANCE
 * ===========================================
 * Objectif : Valider les optimisations des requêtes lentes
 * Teste les méthodes optimisées vs méthodes originales
 */

interface CelData {
  COD_CEL: string;
  LIB_CEL: string;
  ETA_RESULTAT_CEL: string | null;
}

interface PerformanceResult {
  method: string;
  duration: number;
  resultCount: number;
  avgTimePerRecord: number;
}

class PerformanceTester {
  private results: PerformanceResult[] = [];

  /**
   * Mesurer le temps d'exécution d'une fonction
   */
  private async measureTime<T>(fn: () => Promise<T>, methodName: string): Promise<T> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    
    this.results.push({
      method: methodName,
      duration,
      resultCount: Array.isArray(result) ? result.length : 1,
      avgTimePerRecord: Array.isArray(result) ? duration / result.length : duration
    });
    
    console.log(`⏱️  ${methodName}: ${duration}ms (${Array.isArray(result) ? result.length : 1} résultats)`);
    return result;
  }

  /**
   * 🐌 MÉTHODE ORIGINALE (LENTE) - Version Prisma avec relations
   */
  private async getCelsOriginal(codeDepartement: string): Promise<CelData[]> {
    const cels = await prisma.tblCel.findMany({
      where: { 
        lieuxVote: {
          some: {
            departement: {
              codeDepartement: codeDepartement
            }
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    return cels.map(cel => ({
      COD_CEL: cel.codeCellule,
      LIB_CEL: cel.libelleCellule,
      ETA_RESULTAT_CEL: cel.etatResultatCellule
    }));
  }

  /**
   * 🚀 MÉTHODE OPTIMISÉE - Version EXISTS
   */
  private async getCelsOptimized(codeDepartement: string): Promise<CelData[]> {
    const result = await prisma.$queryRaw<CelData[]>`
      SELECT 
        c.COD_CEL,
        c.LIB_CEL,
        c.ETA_RESULTAT_CEL
      FROM TBL_CEL c
      WHERE EXISTS (
        SELECT 1 
        FROM TBL_LV lv 
        WHERE lv.COD_CEL = c.COD_CEL 
          AND lv.COD_DEPT = ${codeDepartement}
      )
    `;
    return result;
  }

  /**
   * 🚀 MÉTHODE BATCH - Récupérer plusieurs départements en une fois
   */
  private async getCelsBatch(codesDepartements: string[]): Promise<Map<string, CelData[]>> {
    if (codesDepartements.length === 0) {
      return new Map();
    }

    const result = await prisma.$queryRaw<Array<{
      COD_DEPT: string;
      COD_CEL: string;
      LIB_CEL: string;
      ETA_RESULTAT_CEL: string | null;
    }>>`
      SELECT DISTINCT
        lv.COD_DEPT,
        c.COD_CEL,
        c.LIB_CEL,
        c.ETA_RESULTAT_CEL
      FROM TBL_CEL c
      INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL
      WHERE lv.COD_DEPT IN (${codesDepartements.join(',')})
    `;

    const groupedCels = new Map<string, CelData[]>();
    result.forEach(row => {
      if (!groupedCels.has(row.COD_DEPT)) {
        groupedCels.set(row.COD_DEPT, []);
      }
      groupedCels.get(row.COD_DEPT)!.push({
        COD_CEL: row.COD_CEL,
        LIB_CEL: row.LIB_CEL,
        ETA_RESULTAT_CEL: row.ETA_RESULTAT_CEL
      });
    });

    return groupedCels;
  }

  /**
   * 🧪 TEST 1 : Comparaison méthode par méthode
   */
  async testSingleDepartment(): Promise<void> {
    console.log('\n🧪 TEST 1 : Comparaison méthode par méthode');
    console.log('='.repeat(50));

    // Récupérer un département de test
    const testDept = await prisma.tblDept.findFirst({
      where: { codeDepartement: { not: '022' } },
      select: { codeDepartement: true, libelleDepartement: true }
    });

    if (!testDept) {
      console.log('❌ Aucun département trouvé pour le test');
      return;
    }

    console.log(`📊 Test sur le département : ${testDept.libelleDepartement} (${testDept.codeDepartement})`);

    // Test méthode originale
    await this.measureTime(
      () => this.getCelsOriginal(testDept.codeDepartement),
      '🐌 Méthode originale (Prisma relations)'
    );

    // Test méthode optimisée
    await this.measureTime(
      () => this.getCelsOptimized(testDept.codeDepartement),
      '🚀 Méthode optimisée (EXISTS)'
    );
  }

  /**
   * 🧪 TEST 2 : Test batch pour plusieurs départements
   */
  async testMultipleDepartments(): Promise<void> {
    console.log('\n🧪 TEST 2 : Test batch pour plusieurs départements');
    console.log('='.repeat(50));

    // Récupérer 5 départements de test
    const testDepts = await prisma.tblDept.findMany({
      where: { codeDepartement: { not: '022' } },
      select: { codeDepartement: true, libelleDepartement: true },
      take: 5
    });

    if (testDepts.length === 0) {
      console.log('❌ Aucun département trouvé pour le test');
      return;
    }

    const codesDepts = testDepts.map(d => d.codeDepartement);
    console.log(`📊 Test sur ${testDepts.length} départements : ${codesDepts.join(', ')}`);

    // Test méthode séquentielle (N requêtes)
    console.log('\n🐌 Test séquentiel (N requêtes) :');
    const startSequential = Date.now();
    for (const dept of testDepts) {
      await this.getCelsOptimized(dept.codeDepartement);
    }
    const sequentialTime = Date.now() - startSequential;
    console.log(`⏱️  Temps total séquentiel : ${sequentialTime}ms`);

    // Test méthode batch (1 requête)
    await this.measureTime(
      () => this.getCelsBatch(codesDepts),
      '🚀 Méthode batch (1 requête)'
    );
  }

  /**
   * 🧪 TEST 3 : Test de charge avec plusieurs utilisateurs simulés
   */
  async testLoadSimulation(): Promise<void> {
    console.log('\n🧪 TEST 3 : Test de charge simulé');
    console.log('='.repeat(50));

    const testDepts = await prisma.tblDept.findMany({
      where: { codeDepartement: { not: '022' } },
      select: { codeDepartement: true },
      take: 10
    });

    if (testDepts.length === 0) {
      console.log('❌ Aucun département trouvé pour le test');
      return;
    }

    const codesDepts = testDepts.map(d => d.codeDepartement);

    // Simuler 5 utilisateurs simultanés
    console.log('🔄 Simulation de 5 utilisateurs simultanés...');
    const startTime = Date.now();
    
    const promises = Array.from({ length: 5 }, async (_, index) => {
      const userDepts = codesDepts.slice(index * 2, (index + 1) * 2);
      return this.getCelsBatch(userDepts);
    });

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log(`⏱️  Temps total pour 5 utilisateurs : ${totalTime}ms`);
    console.log(`📊 Temps moyen par utilisateur : ${totalTime / 5}ms`);
  }

  /**
   * 📊 Afficher le rapport de performance
   */
  displayReport(): void {
    console.log('\n📊 RAPPORT DE PERFORMANCE');
    console.log('='.repeat(50));

    if (this.results.length === 0) {
      console.log('❌ Aucun résultat à afficher');
      return;
    }

    // Trier par durée
    this.results.sort((a, b) => a.duration - b.duration);

    console.log('\n🏆 CLASSEMENT PAR PERFORMANCE :');
    this.results.forEach((result, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`${emoji} ${result.method}: ${result.duration}ms`);
    });

    // Calculer les gains
    const slowest = this.results[this.results.length - 1];
    const fastest = this.results[0];
    const gain = ((slowest.duration - fastest.duration) / slowest.duration) * 100;

    console.log(`\n⚡ GAIN DE PERFORMANCE : ${gain.toFixed(1)}% plus rapide`);
    console.log(`📈 Amélioration : ${slowest.duration}ms → ${fastest.duration}ms`);

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS :');
    if (gain > 80) {
      console.log('✅ Excellent ! Les optimisations sont très efficaces');
    } else if (gain > 50) {
      console.log('✅ Bon ! Les optimisations apportent une amélioration significative');
    } else if (gain > 20) {
      console.log('⚠️  Modéré. Considérer des optimisations supplémentaires');
    } else {
      console.log('❌ Faible amélioration. Revoir les optimisations');
    }
  }

  /**
   * 🚀 Exécuter tous les tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 DÉMARRAGE DES TESTS DE PERFORMANCE');
    console.log('='.repeat(50));
    console.log('📅 Date :', new Date().toLocaleString());
    console.log('🎯 Objectif : Valider les optimisations des requêtes lentes');

    try {
      await this.testSingleDepartment();
      await this.testMultipleDepartments();
      await this.testLoadSimulation();
      this.displayReport();
    } catch (error) {
      console.error('❌ Erreur lors des tests :', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

/**
 * 🎯 POINT D'ENTRÉE
 */
async function main() {
  const tester = new PerformanceTester();
  await tester.runAllTests();
}

// Exécuter les tests
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceTester };
