import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🚀 SCRIPT DE TEST DE PERFORMANCE - OPTIMISATION TBL_IMPORT_EXCEL_CEL
 * ===========================================
 * Objectif : Valider les optimisations des requêtes sur TBL_IMPORT_EXCEL_CEL
 * Teste les méthodes optimisées vs méthodes originales
 */

interface ImportData {
  codeCellule: string;
  populationHommes: number;
  populationFemmes: number;
  populationTotale: number;
  personnesAstreintes: number;
  votantsHommes: number;
  votantsFemmes: number;
  totalVotants: number;
  tauxParticipation: number;
  bulletinsNuls: number;
  suffrageExprime: number;
  bulletinsBlancs: number;
  score1: number;
  score2: number;
  score3: number;
  score4: number;
  score5: number;
}

interface PerformanceResult {
  method: string;
  duration: number;
  resultCount: number;
  avgTimePerRecord: number;
}

class ImportPerformanceTester {
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
   * 🐌 MÉTHODE ORIGINALE (LENTE) - Version Prisma avec IN
   */
  private async getImportDataOriginal(celCodes: string[]): Promise<ImportData[]> {
    const importData = await prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: { in: celCodes },
        statutImport: 'COMPLETED'
      },
      select: {
        codeCellule: true,
        populationHommes: true,
        populationFemmes: true,
        populationTotale: true,
        personnesAstreintes: true,
        votantsHommes: true,
        votantsFemmes: true,
        totalVotants: true,
        tauxParticipation: true,
        bulletinsNuls: true,
        suffrageExprime: true,
        bulletinsBlancs: true,
        score1: true,
        score2: true,
        score3: true,
        score4: true,
        score5: true
      }
    });

    return importData.map(data => ({
      codeCellule: data.codeCellule,
      populationHommes: Number(data.populationHommes) || 0,
      populationFemmes: Number(data.populationFemmes) || 0,
      populationTotale: Number(data.populationTotale) || 0,
      personnesAstreintes: Number(data.personnesAstreintes) || 0,
      votantsHommes: Number(data.votantsHommes) || 0,
      votantsFemmes: Number(data.votantsFemmes) || 0,
      totalVotants: Number(data.totalVotants) || 0,
      tauxParticipation: Number(data.tauxParticipation) || 0,
      bulletinsNuls: Number(data.bulletinsNuls) || 0,
      suffrageExprime: Number(data.suffrageExprime) || 0,
      bulletinsBlancs: Number(data.bulletinsBlancs) || 0,
      score1: Number(data.score1) || 0,
      score2: Number(data.score2) || 0,
      score3: Number(data.score3) || 0,
      score4: Number(data.score4) || 0,
      score5: Number(data.score5) || 0
    }));
  }

  /**
   * 🚀 MÉTHODE OPTIMISÉE - Version SQL directe
   */
  private async getImportDataOptimized(celCodes: string[]): Promise<ImportData[]> {
    if (celCodes.length === 0) {
      return [];
    }

    const result = await prisma.$queryRaw<Array<{
      COD_CEL: string;
      POP_HOM: string;
      POP_FEM: string;
      POP_TOTAL: string;
      PERS_ASTR: string;
      VOT_HOM: string;
      VOT_FEM: string;
      TOTAL_VOT: string;
      TAUX_PART: string;
      BUL_NUL: string;
      SUF_EXP: string;
      BUL_BLANC: string;
      SCORE_1: string;
      SCORE_2: string;
      SCORE_3: string;
      SCORE_4: string;
      SCORE_5: string;
    }>>`
      SELECT 
        COD_CEL,
        POP_HOM,
        POP_FEM,
        POP_TOTAL,
        PERS_ASTR,
        VOT_HOM,
        VOT_FEM,
        TOTAL_VOT,
        TAUX_PART,
        BUL_NUL,
        SUF_EXP,
        BUL_BLANC,
        SCORE_1,
        SCORE_2,
        SCORE_3,
        SCORE_4,
        SCORE_5
      FROM TBL_IMPORT_EXCEL_CEL
      WHERE COD_CEL IN (${celCodes.join(',')})
        AND STATUT_IMPORT = 'COMPLETED'
    `;

    return result.map(row => ({
      codeCellule: row.COD_CEL,
      populationHommes: Number(row.POP_HOM) || 0,
      populationFemmes: Number(row.POP_FEM) || 0,
      populationTotale: Number(row.POP_TOTAL) || 0,
      personnesAstreintes: Number(row.PERS_ASTR) || 0,
      votantsHommes: Number(row.VOT_HOM) || 0,
      votantsFemmes: Number(row.VOT_FEM) || 0,
      totalVotants: Number(row.TOTAL_VOT) || 0,
      tauxParticipation: Number(row.TAUX_PART) || 0,
      bulletinsNuls: Number(row.BUL_NUL) || 0,
      suffrageExprime: Number(row.SUF_EXP) || 0,
      bulletinsBlancs: Number(row.BUL_BLANC) || 0,
      score1: Number(row.SCORE_1) || 0,
      score2: Number(row.SCORE_2) || 0,
      score3: Number(row.SCORE_3) || 0,
      score4: Number(row.SCORE_4) || 0,
      score5: Number(row.SCORE_5) || 0
    }));
  }

  /**
   * 🚀 MÉTHODE BATCH ULTRA-OPTIMISÉE - Version avec Map
   */
  private async getImportDataBatch(celCodes: string[]): Promise<Map<string, ImportData[]>> {
    if (celCodes.length === 0) {
      return new Map();
    }

    const result = await prisma.$queryRaw<Array<{
      COD_CEL: string;
      POP_HOM: string;
      POP_FEM: string;
      POP_TOTAL: string;
      PERS_ASTR: string;
      VOT_HOM: string;
      VOT_FEM: string;
      TOTAL_VOT: string;
      TAUX_PART: string;
      BUL_NUL: string;
      SUF_EXP: string;
      BUL_BLANC: string;
      SCORE_1: string;
      SCORE_2: string;
      SCORE_3: string;
      SCORE_4: string;
      SCORE_5: string;
    }>>`
      SELECT 
        COD_CEL,
        POP_HOM,
        POP_FEM,
        POP_TOTAL,
        PERS_ASTR,
        VOT_HOM,
        VOT_FEM,
        TOTAL_VOT,
        TAUX_PART,
        BUL_NUL,
        SUF_EXP,
        BUL_BLANC,
        SCORE_1,
        SCORE_2,
        SCORE_3,
        SCORE_4,
        SCORE_5
      FROM TBL_IMPORT_EXCEL_CEL
      WHERE COD_CEL IN (${celCodes.join(',')})
        AND STATUT_IMPORT = 'COMPLETED'
    `;

    // Grouper par CEL
    const groupedImportData = new Map<string, ImportData[]>();
    result.forEach(row => {
      if (!groupedImportData.has(row.COD_CEL)) {
        groupedImportData.set(row.COD_CEL, []);
      }
      groupedImportData.get(row.COD_CEL)!.push({
        codeCellule: row.COD_CEL,
        populationHommes: Number(row.POP_HOM) || 0,
        populationFemmes: Number(row.POP_FEM) || 0,
        populationTotale: Number(row.POP_TOTAL) || 0,
        personnesAstreintes: Number(row.PERS_ASTR) || 0,
        votantsHommes: Number(row.VOT_HOM) || 0,
        votantsFemmes: Number(row.VOT_FEM) || 0,
        totalVotants: Number(row.TOTAL_VOT) || 0,
        tauxParticipation: Number(row.TAUX_PART) || 0,
        bulletinsNuls: Number(row.BUL_NUL) || 0,
        suffrageExprime: Number(row.SUF_EXP) || 0,
        bulletinsBlancs: Number(row.BUL_BLANC) || 0,
        score1: Number(row.SCORE_1) || 0,
        score2: Number(row.SCORE_2) || 0,
        score3: Number(row.SCORE_3) || 0,
        score4: Number(row.SCORE_4) || 0,
        score5: Number(row.SCORE_5) || 0
      });
    });

    return groupedImportData;
  }

  /**
   * 🧪 TEST 1 : Comparaison méthode par méthode
   */
  async testSingleBatch(): Promise<void> {
    console.log('\n🧪 TEST 1 : Comparaison méthode par méthode');
    console.log('='.repeat(50));

    // Récupérer des codes CEL de test
    const testCels = await prisma.tblImportExcelCel.findMany({
      where: { statutImport: 'COMPLETED' },
      select: { codeCellule: true },
      take: 10
    });

    if (testCels.length === 0) {
      console.log('❌ Aucune donnée d\'import trouvée pour le test');
      return;
    }

    const celCodes = testCels.map(cel => cel.codeCellule);
    console.log(`📊 Test sur ${celCodes.length} CELs : ${celCodes.slice(0, 3).join(', ')}...`);

    // Test méthode originale
    await this.measureTime(
      () => this.getImportDataOriginal(celCodes),
      '🐌 Méthode originale (Prisma IN)'
    );

    // Test méthode optimisée
    await this.measureTime(
      () => this.getImportDataOptimized(celCodes),
      '🚀 Méthode optimisée (SQL direct)'
    );

    // Test méthode batch
    await this.measureTime(
      () => this.getImportDataBatch(celCodes),
      '🚀 Méthode batch (Map groupée)'
    );
  }

  /**
   * 🧪 TEST 2 : Test avec différentes tailles de batch
   */
  async testBatchSizes(): Promise<void> {
    console.log('\n🧪 TEST 2 : Test avec différentes tailles de batch');
    console.log('='.repeat(50));

    const batchSizes = [5, 10, 20, 50];
    
    for (const size of batchSizes) {
      const testCels = await prisma.tblImportExcelCel.findMany({
        where: { statutImport: 'COMPLETED' },
        select: { codeCellule: true },
        take: size
      });

      if (testCels.length === 0) continue;

      const celCodes = testCels.map(cel => cel.codeCellule);
      console.log(`\n📊 Test avec ${celCodes.length} CELs :`);

      // Test méthode originale
      await this.measureTime(
        () => this.getImportDataOriginal(celCodes),
        `🐌 Original (${size} CELs)`
      );

      // Test méthode optimisée
      await this.measureTime(
        () => this.getImportDataOptimized(celCodes),
        `🚀 Optimisé (${size} CELs)`
      );
    }
  }

  /**
   * 🧪 TEST 3 : Test de charge avec plusieurs utilisateurs simulés
   */
  async testLoadSimulation(): Promise<void> {
    console.log('\n🧪 TEST 3 : Test de charge simulé');
    console.log('='.repeat(50));

    const testCels = await prisma.tblImportExcelCel.findMany({
      where: { statutImport: 'COMPLETED' },
      select: { codeCellule: true },
      take: 30
    });

    if (testCels.length === 0) {
      console.log('❌ Aucune donnée d\'import trouvée pour le test');
      return;
    }

    const celCodes = testCels.map(cel => cel.codeCellule);

    // Simuler 5 utilisateurs simultanés
    console.log('🔄 Simulation de 5 utilisateurs simultanés...');
    const startTime = Date.now();
    
    const promises = Array.from({ length: 5 }, async (_, index) => {
      const userCels = celCodes.slice(index * 6, (index + 1) * 6);
      return this.getImportDataOptimized(userCels);
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
    console.log('\n📊 RAPPORT DE PERFORMANCE - TBL_IMPORT_EXCEL_CEL');
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

    // Recommandations spécifiques
    console.log('\n🎯 RECOMMANDATIONS SPÉCIFIQUES :');
    console.log('1. Utiliser la méthode batch pour les requêtes multiples');
    console.log('2. Appliquer les index SQL sur TBL_IMPORT_EXCEL_CEL');
    console.log('3. Éviter les requêtes Prisma avec IN sur de gros datasets');
    console.log('4. Préférer les requêtes SQL directes pour les agrégations');
  }

  /**
   * 🚀 Exécuter tous les tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 DÉMARRAGE DES TESTS DE PERFORMANCE - TBL_IMPORT_EXCEL_CEL');
    console.log('='.repeat(50));
    console.log('📅 Date :', new Date().toLocaleString());
    console.log('🎯 Objectif : Valider les optimisations des requêtes sur TBL_IMPORT_EXCEL_CEL');

    try {
      await this.testSingleBatch();
      await this.testBatchSizes();
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
  const tester = new ImportPerformanceTester();
  await tester.runAllTests();
}

// Exécuter les tests
if (require.main === module) {
  main().catch(console.error);
}

export { ImportPerformanceTester };
