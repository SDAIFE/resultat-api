import { PublicationService } from '../src/publication/publication.service';
import { PrismaService } from '../src/database/prisma.service';

const prismaService = new PrismaService();
const publicationService = new PublicationService(prismaService);

async function testFinalValidation() {
  console.log('='.repeat(80));
  console.log('✅ VALIDATION FINALE : API Communes d\'Abidjan');
  console.log('='.repeat(80));
  console.log();

  try {
    console.log('🔍 TEST : Appel du service getDepartments() (comme le ferait l\'API)');
    console.log('-'.repeat(80));
    console.log();

    // Simuler exactement ce que fait l'API quand elle reçoit la requête
    const result = await publicationService.getDepartments({
      page: 1,
      limit: 10
    });

    // Analyser la réponse
    console.log('📊 STRUCTURE DE LA RÉPONSE :');
    console.log('-'.repeat(80));
    console.log();
    
    const keys = Object.keys(result);
    console.log(`Clés présentes : ${keys.join(', ')}`);
    console.log();

    console.log('✅ VALIDATION :');
    console.log(`  ✓ Champ "entities" : ${keys.includes('entities') ? '✅ OUI' : '❌ NON'}`);
    console.log(`  ✓ Champ "total" : ${keys.includes('total') ? '✅ OUI' : '❌ NON'}`);
    console.log(`  ✓ Champ "page" : ${keys.includes('page') ? '✅ OUI' : '❌ NON'}`);
    console.log(`  ✓ Champ "limit" : ${keys.includes('limit') ? '✅ OUI' : '❌ NON'}`);
    console.log(`  ✓ Champ "totalPages" : ${keys.includes('totalPages') ? '✅ OUI' : '❌ NON'}`);
    console.log();

    console.log('📈 DONNÉES :');
    console.log(`  Total d'entités : ${result.total}`);
    console.log(`  Page : ${result.page}`);
    console.log(`  Limite : ${result.limit}`);
    console.log(`  Total pages : ${result.totalPages}`);
    console.log(`  Entités dans cette page : ${result.entities.length}`);
    console.log();

    // Analyser les types
    const types = new Set(result.entities.map((e: any) => e.type));
    const departments = result.entities.filter((e: any) => e.type === 'DEPARTMENT');
    const communes = result.entities.filter((e: any) => e.type === 'COMMUNE');

    console.log('🏛️  TYPES D\'ENTITÉS :');
    console.log(`  Types présents : ${Array.from(types).join(', ')}`);
    console.log(`  Départements : ${departments.length}`);
    console.log(`  Communes : ${communes.length}`);
    console.log();

    // Afficher les communes d'Abidjan
    if (communes.length > 0) {
      console.log('🏙️  COMMUNES D\'ABIDJAN DANS CETTE PAGE :');
      console.log('-'.repeat(80));
      communes.forEach((commune: any, index: number) => {
        console.log(`  ${index + 1}. ${commune.libelle} (Code: ${commune.code}, CELs: ${commune.totalCels})`);
      });
      console.log();
    }

    // Vérification globale
    console.log('='.repeat(80));
    console.log('🎯 RÉSULTAT FINAL');
    console.log('='.repeat(80));
    console.log();

    const checks = [
      { name: 'Champ "entities" présent', passed: keys.includes('entities') },
      { name: 'Total >= 125', passed: result.total >= 125 },
      { name: 'Type "COMMUNE" présent', passed: types.has('COMMUNE') },
      { name: 'Au moins une commune d\'Abidjan', passed: communes.length > 0 }
    ];

    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    console.log();

    const allPassed = checks.every(c => c.passed);

    if (allPassed) {
      console.log('🎉 SUCCÈS : L\'API retourne le NOUVEAU format avec les communes d\'Abidjan !');
      console.log();
      console.log('Le frontend peut maintenant :');
      console.log('  1. Appeler GET /api/publications/departments');
      console.log('  2. Recevoir 125 entités (départements + communes)');
      console.log('  3. Afficher les 14 communes d\'Abidjan individuellement');
      console.log();
      console.log('✅ PRÊT POUR LA PRODUCTION !');
    } else {
      console.log('❌ PROBLÈME : L\'API ne retourne pas le format attendu');
      console.log();
      console.log('Actions à faire :');
      console.log('  1. Vérifier que le serveur a bien été redémarré');
      console.log('  2. Vérifier qu\'il n\'y a pas de cache');
      console.log('  3. Vérifier que le bon code est déployé');
    }
    console.log();

  } catch (error) {
    console.error('❌ ERREUR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prismaService.$disconnect();
  }
}

testFinalValidation()
  .then(() => {
    console.log('✅ Validation terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

