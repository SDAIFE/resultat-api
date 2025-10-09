/**
 * Script de test des performances après optimisation
 * 
 * Teste :
 * - Temps de réponse de getDepartments()
 * - Comparaison avant/après
 * - Validation des résultats identiques
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPerformance() {
  console.log('\n🚀 TEST DE PERFORMANCE - OPTIMISATION DES REQUÊTES\n');
  console.log('='.repeat(70));

  try {
    // Test 1 : Mesurer le temps de getDepartments (première page)
    console.log('\n📊 Test 1 : Temps de réponse getDepartments (page 1, limit 10)');
    console.log('-'.repeat(70));

    const startTime = Date.now();
    
    // Simuler la requête getDepartments (on peut pas l'appeler directement ici)
    // Donc on teste juste la nouvelle méthode optimisée getCelsForDepartment
    
    // 1. Récupérer un département de test
    const dept = await prisma.tblDept.findFirst({
      where: { codeDepartement: { not: '022' } }
    });

    if (!dept) {
      throw new Error('Aucun département trouvé');
    }

    console.log(`\n✓ Département de test : ${dept.libelleDepartement} (${dept.codeDepartement})`);

    // 2. Test de la nouvelle méthode optimisée (SQL direct)
    console.log('\n🚀 NOUVELLE MÉTHODE (SQL direct) :');
    const startOptimized = Date.now();
    
    const celsOptimized = await prisma.$queryRaw<Array<{
      COD_CEL: string;
      LIB_CEL: string;
      ETA_RESULTAT_CEL: string | null;
    }>>`
      SELECT DISTINCT 
        c.COD_CEL,
        c.LIB_CEL,
        c.ETA_RESULTAT_CEL
      FROM TBL_CEL c
      INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL
      WHERE lv.COD_DEPT = ${dept.codeDepartement}
    `;
    
    const timeOptimized = Date.now() - startOptimized;
    console.log(`  ⏱️  Temps : ${timeOptimized}ms`);
    console.log(`  ✓ CELs trouvées : ${celsOptimized.length}`);

    // 3. Test de l'ancienne méthode (Prisma avec relations)
    console.log('\n🐌 ANCIENNE MÉTHODE (Prisma avec relations) :');
    const startOld = Date.now();
    
    const celsOld = await prisma.tblCel.findMany({
      where: { 
        lieuxVote: {
          some: {
            departement: {
              codeDepartement: dept.codeDepartement
            }
          }
        }
      }
    });
    
    const timeOld = Date.now() - startOld;
    console.log(`  ⏱️  Temps : ${timeOld}ms`);
    console.log(`  ✓ CELs trouvées : ${celsOld.length}`);

    // 4. Comparaison
    console.log('\n📈 RÉSULTATS :');
    console.log('-'.repeat(70));
    console.log(`  Ancienne méthode : ${timeOld}ms`);
    console.log(`  Nouvelle méthode : ${timeOptimized}ms`);
    
    const gain = timeOld - timeOptimized;
    const gainPercent = Math.round((gain / timeOld) * 100);
    
    console.log(`  🎯 Gain : -${gain}ms (${gainPercent}% plus rapide)`);

    // 5. Validation des résultats
    console.log('\n✅ VALIDATION DES RÉSULTATS :');
    console.log('-'.repeat(70));
    
    if (celsOptimized.length === celsOld.length) {
      console.log(`  ✓ Même nombre de CELs : ${celsOptimized.length}`);
    } else {
      console.log(`  ⚠️  Différence : ${celsOptimized.length} vs ${celsOld.length}`);
    }

    // Vérifier que tous les codes de CEL sont présents
    const codesOptimized = new Set(celsOptimized.map(c => c.COD_CEL));
    const codesOld = new Set(celsOld.map(c => c.codeCellule));
    
    const missing = celsOld.filter(c => !codesOptimized.has(c.codeCellule));
    const extra = celsOptimized.filter(c => !codesOld.has(c.COD_CEL));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✓ Tous les codes de CEL correspondent`);
    } else {
      if (missing.length > 0) {
        console.log(`  ⚠️  CELs manquantes dans la nouvelle version : ${missing.length}`);
      }
      if (extra.length > 0) {
        console.log(`  ⚠️  CELs en trop dans la nouvelle version : ${extra.length}`);
      }
    }

    // 6. Estimation du gain global
    console.log('\n🌍 ESTIMATION DU GAIN GLOBAL :');
    console.log('-'.repeat(70));
    
    console.log(`  Si 10 entités par page :`);
    console.log(`    Ancienne méthode : ~${timeOld * 10}ms (~${(timeOld * 10 / 1000).toFixed(1)}s)`);
    console.log(`    Nouvelle méthode : ~${timeOptimized * 10}ms (~${(timeOptimized * 10 / 1000).toFixed(1)}s)`);
    console.log(`    Gain par page : -${gain * 10}ms (-${(gain * 10 / 1000).toFixed(1)}s)`);

    console.log('\n✅ TEST TERMINÉ AVEC SUCCÈS !');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ ERREUR lors du test :', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testPerformance();

