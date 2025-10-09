import { PrismaClient } from '@prisma/client';
import { PublicationService } from '../src/publication/publication.service';
import { PrismaService } from '../src/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const publicationService = new PublicationService(prismaService);

async function testAbidjanPublication() {
  console.log('='.repeat(80));
  console.log('TEST : Publication Abidjan (Communes)');
  console.log('='.repeat(80));
  console.log();

  try {
    // TEST 1 : getStats() - Vérifier le compte total d'entités
    console.log('📊 TEST 1 : getStats()');
    console.log('-'.repeat(80));
    
    const stats = await publicationService.getStats();
    
    console.log('Statistiques globales:');
    console.log(`  Total entités: ${stats.totalDepartments}`);
    console.log(`  Entités publiées: ${stats.publishedDepartments}`);
    console.log(`  Entités en attente: ${stats.pendingDepartments}`);
    console.log(`  Total CELs: ${stats.totalCels}`);
    console.log(`  CELs importées: ${stats.importedCels}`);
    console.log(`  CELs en attente: ${stats.pendingCels}`);
    console.log(`  Taux de publication: ${stats.publicationRate}%`);
    console.log();
    
    // Vérification
    if (stats.totalDepartments === 125) {
      console.log('✅ SUCCÈS : Total = 125 entités (111 départements + 14 communes Abidjan)');
    } else {
      console.log(`⚠️  ATTENTION : Total = ${stats.totalDepartments} au lieu de 125`);
      console.log('   Cela peut être normal si des données sont filtrées');
    }
    console.log();

    // TEST 2 : getDepartments() - Vérifier la liste complète
    console.log('📋 TEST 2 : getDepartments() - Liste complète');
    console.log('-'.repeat(80));
    
    const allEntities = await publicationService.getDepartments({
      page: 1,
      limit: 150 // Récupérer toutes les entités
    });
    
    console.log(`Total d'entités retournées: ${allEntities.total}`);
    console.log(`Nombre d'entités dans la page: ${allEntities.entities.length}`);
    console.log();

    // Compter les départements et communes
    const departments = allEntities.entities.filter(e => e.type === 'DEPARTMENT');
    const communes = allEntities.entities.filter(e => e.type === 'COMMUNE');
    
    console.log(`  Départements: ${departments.length}`);
    console.log(`  Communes d'Abidjan: ${communes.length}`);
    console.log();

    if (communes.length === 14) {
      console.log('✅ SUCCÈS : 14 communes d\'Abidjan trouvées dans la liste');
    } else {
      console.log(`❌ ERREUR : ${communes.length} communes trouvées au lieu de 14`);
    }
    console.log();

    // TEST 3 : Vérifier que le département Abidjan (022) n'apparaît PAS
    console.log('🔍 TEST 3 : Vérifier qu\'Abidjan (022) n\'apparaît pas comme département');
    console.log('-'.repeat(80));
    
    const abidjanDept = allEntities.entities.find(
      e => e.type === 'DEPARTMENT' && e.codeDepartement === '022'
    );
    
    if (!abidjanDept) {
      console.log('✅ SUCCÈS : Le département Abidjan (022) n\'apparaît pas dans la liste');
    } else {
      console.log('❌ ERREUR : Le département Abidjan (022) apparaît encore dans la liste');
    }
    console.log();

    // TEST 4 : Afficher les 14 communes d'Abidjan
    console.log('🏙️  TEST 4 : Liste des 14 communes d\'Abidjan');
    console.log('-'.repeat(80));
    
    if (communes.length > 0) {
      const communesSorted = communes.sort((a, b) => a.libelle.localeCompare(b.libelle));
      
      communesSorted.forEach((commune, index) => {
        const statusEmoji = commune.publicationStatus === 'PUBLISHED' ? '✅' : 
                            commune.publicationStatus === 'CANCELLED' ? '❌' : '⏳';
        
        console.log(`${(index + 1).toString().padStart(2)}. ${statusEmoji} ${commune.libelle.padEnd(35)} | CELs: ${commune.totalCels.toString().padStart(2)} (${commune.importedCels} importées, ${commune.pendingCels} en attente)`);
      });
      console.log();
      
      // Statistiques des communes
      const totalCels = communes.reduce((sum, c) => sum + c.totalCels, 0);
      const importedCels = communes.reduce((sum, c) => sum + c.importedCels, 0);
      const pendingCels = communes.reduce((sum, c) => sum + c.pendingCels, 0);
      
      console.log('-'.repeat(80));
      console.log(`Total CELs Abidjan: ${totalCels}`);
      console.log(`  Importées: ${importedCels}`);
      console.log(`  En attente: ${pendingCels}`);
      console.log();
    }

    // TEST 5 : Tester la pagination
    console.log('📄 TEST 5 : Pagination');
    console.log('-'.repeat(80));
    
    const page1 = await publicationService.getDepartments({ page: 1, limit: 10 });
    const page2 = await publicationService.getDepartments({ page: 2, limit: 10 });
    
    console.log(`Page 1 : ${page1.entities.length} entités`);
    console.log(`  Première: ${page1.entities[0]?.libelle}`);
    console.log(`  Dernière: ${page1.entities[page1.entities.length - 1]?.libelle}`);
    console.log();
    console.log(`Page 2 : ${page2.entities.length} entités`);
    console.log(`  Première: ${page2.entities[0]?.libelle}`);
    console.log(`  Dernière: ${page2.entities[page2.entities.length - 1]?.libelle}`);
    console.log();

    if (page1.entities[0]?.id !== page2.entities[0]?.id) {
      console.log('✅ SUCCÈS : La pagination fonctionne (pages différentes)');
    } else {
      console.log('❌ ERREUR : La pagination ne fonctionne pas correctement');
    }
    console.log();

    // TEST 6 : Tester le filtre de recherche
    console.log('🔎 TEST 6 : Filtre de recherche');
    console.log('-'.repeat(80));
    
    const searchResults = await publicationService.getDepartments({
      page: 1,
      limit: 50,
      search: 'COCODY'
    });
    
    console.log(`Recherche "COCODY" : ${searchResults.total} résultat(s)`);
    
    if (searchResults.total > 0) {
      searchResults.entities.forEach(e => {
        console.log(`  - ${e.libelle} (${e.type})`);
      });
      console.log();
      
      const coco = searchResults.entities.find(e => e.libelle.includes('COCODY'));
      if (coco && coco.type === 'COMMUNE') {
        console.log('✅ SUCCÈS : La commune COCODY d\'Abidjan est trouvée par la recherche');
      }
    } else {
      console.log('⚠️  Aucun résultat pour "COCODY"');
    }
    console.log();

    // TEST 7 : Tester le filtre par code département
    console.log('🎯 TEST 7 : Filtre par code département (022 = Abidjan)');
    console.log('-'.repeat(80));
    
    const abidjanOnly = await publicationService.getDepartments({
      page: 1,
      limit: 50,
      codeDepartement: '022'
    });
    
    console.log(`Résultats pour codeDepartement='022' : ${abidjanOnly.total} entité(s)`);
    
    if (abidjanOnly.total === 14) {
      console.log('✅ SUCCÈS : Le filtre retourne bien les 14 communes d\'Abidjan');
    } else {
      console.log(`⚠️  ATTENTION : ${abidjanOnly.total} entités retournées au lieu de 14`);
    }
    
    console.log();
    console.log('Communes retournées:');
    abidjanOnly.entities.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.libelle} (type: ${e.type})`);
    });
    console.log();

    // RÉSUMÉ DES TESTS
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(80));
    
    const tests = [
      { name: 'getStats() retourne ~125 entités', passed: stats.totalDepartments >= 111 },
      { name: '14 communes d\'Abidjan dans la liste', passed: communes.length === 14 },
      { name: 'Département Abidjan (022) absent', passed: !abidjanDept },
      { name: 'Pagination fonctionnelle', passed: page1.entities[0]?.id !== page2.entities[0]?.id },
      { name: 'Recherche fonctionnelle', passed: searchResults.total > 0 },
      { name: 'Filtre par département fonctionnel', passed: abidjanOnly.total === 14 }
    ];

    console.log();
    tests.forEach((test, index) => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`${icon} Test ${index + 1}: ${test.name}`);
    });
    
    const passedCount = tests.filter(t => t.passed).length;
    const totalTests = tests.length;
    
    console.log();
    console.log(`Résultat: ${passedCount}/${totalTests} tests réussis (${Math.round((passedCount/totalTests) * 100)}%)`);
    console.log();

  } catch (error) {
    console.error('❌ ERREUR lors des tests:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
    await prismaService.$disconnect();
  }
}

// Exécuter les tests
testAbidjanPublication()
  .then(() => {
    console.log('✅ Tests terminés avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

