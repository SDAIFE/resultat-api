/**
 * Script de Test : Endpoint Commune ABOBO (022-001)
 * 
 * Ce script simule l'appel de l'endpoint pour voir exactement
 * ce qui est retourné et diagnostiquer le tableau vide
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEndpointCommuneAbobo() {
  console.log('🧪 TEST ENDPOINT COMMUNE ABOBO (022-001)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Simuler exactement ce que fait la méthode getCommuneData()
    const codeCommune = '022-001-001'; // Format complet pour ABOBO (dept-sp-com)
    const page = 1;
    const limit = 10;
    
    console.log('📋 PARAMÈTRES DE REQUÊTE :');
    console.log(`   Code Commune : ${codeCommune}`);
    console.log(`   Page : ${page}`);
    console.log(`   Limit : ${limit}`);
    console.log('');

    // ========================================
    // SIMULATION DE LA MÉTHODE getCommuneData
    // ========================================
    
    const skip = (page - 1) * limit;

    // Parse du code (supporte "001", "022-001-001", etc.)
    let communeWhere: any = {};
    
    if (codeCommune.includes('-')) {
      const parts = codeCommune.split('-');
      
      if (parts.length === 3) {
        // Format complet "022-001-001" → département + sous-préfecture + commune
        communeWhere.codeDepartement = parts[0];
        communeWhere.codeSousPrefecture = parts[1];
        communeWhere.codeCommune = parts[2];
        console.log(`🔄 Code parsé : "${codeCommune}" → codeDept="${parts[0]}", codeSP="${parts[1]}", codeCom="${parts[2]}"`);
      } else if (parts.length === 2) {
        // Format intermédiaire "022-001" → département + sous-préfecture
        communeWhere.codeDepartement = parts[0];
        communeWhere.codeSousPrefecture = parts[1];
        console.log(`🔄 Code parsé : "${codeCommune}" → codeDept="${parts[0]}", codeSP="${parts[1]}"`);
      }
    } else {
      // Format court "001" → seulement la commune
      communeWhere.codeCommune = codeCommune;
      console.log(`🔄 Code parsé : "${codeCommune}" → codeCommune="${codeCommune}" (AMBIGU)`);
    }
    console.log('');

    // Pas de filtre utilisateur pour ce test (simuler SADMIN/ADMIN)

    console.log('📋 ÉTAPE 1 : Récupération de la commune dans TblCom');
    console.log('-'.repeat(80));
    
    const [communes, total] = await Promise.all([
      prisma.tblCom.findMany({
        where: communeWhere,
        skip,
        take: limit,
        orderBy: { codeCommune: 'asc' },
        select: {
          id: true,
          codeDepartement: true,
          codeCommune: true,
          libelleCommune: true
        }
      }),
      prisma.tblCom.count({ where: communeWhere })
    ]);

    console.log(`✅ Communes trouvées : ${communes.length}`);
    console.log(`✅ Total : ${total}`);
    communes.forEach(c => {
      console.log(`   - ${c.codeDepartement}-${c.codeCommune} : ${c.libelleCommune}`);
    });
    console.log('');

    if (communes.length === 0) {
      console.log('❌ PROBLÈME IDENTIFIÉ : Aucune commune trouvée avec les filtres :');
      console.log(`   WHERE: ${JSON.stringify(communeWhere, null, 2)}`);
      console.log('');
      
      // Chercher avec le code complet
      const communeAvecCodeComplet = await prisma.tblCom.findFirst({
        where: {
          codeDepartement: '022',
          codeCommune: '001'
        }
      });
      
      if (communeAvecCodeComplet) {
        console.log('💡 SOLUTION : La commune existe avec les codes séparés :');
        console.log(`   codeDepartement: "${communeAvecCodeComplet.codeDepartement}"`);
        console.log(`   codeCommune: "${communeAvecCodeComplet.codeCommune}"`);
      }
      
      return;
    }

    // Pour chaque commune, récupérer les CELs
    console.log('📋 ÉTAPE 2 : Récupération des CELs via relation lieuxVote');
    console.log('-'.repeat(80));

    const commune = communes[0];
    
    const celsRaw = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: commune.codeDepartement,
            codeCommune: commune.codeCommune
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`✅ CELs trouvées : ${celsRaw.length}`);
    celsRaw.forEach(cel => {
      console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [État: ${cel.etatResultatCellule || 'null'}]`);
    });
    console.log('');

    // Filtrer par statut I ou P
    console.log('📋 ÉTAPE 3 : Filtrage des CELs par statut I ou P');
    console.log('-'.repeat(80));
    
    const celsFiltered = celsRaw.filter(cel => 
      cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)
    );

    console.log(`✅ CELs avec statut I ou P : ${celsFiltered.length} / ${celsRaw.length}`);
    celsFiltered.forEach(cel => {
      console.log(`   ✅ ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule}]`);
    });
    console.log('');

    if (celsFiltered.length === 0) {
      console.log('❌ PROBLÈME IDENTIFIÉ : Aucune CEL avec statut I ou P');
      console.log('   L\'endpoint retournera un tableau vide car il filtre uniquement les CELs importées.');
      console.log('');
      console.log('💡 SOLUTION : Uploader les fichiers Excel/CSV pour les CELs d\'ABOBO');
      return;
    }

    // Récupérer les données d'import
    console.log('📋 ÉTAPE 4 : Récupération des données d\'import');
    console.log('-'.repeat(80));
    
    const celCodes = celsFiltered.map(cel => cel.codeCellule);
    const importData = await prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: { in: celCodes },
        statutImport: 'COMPLETED'
      }
    });

    console.log(`✅ Lignes d'import trouvées : ${importData.length}`);
    
    // Grouper par CEL
    const importsByCel = new Map<string, number>();
    importData.forEach(imp => {
      const count = importsByCel.get(imp.codeCellule) || 0;
      importsByCel.set(imp.codeCellule, count + 1);
    });

    celCodes.forEach(code => {
      const count = importsByCel.get(code) || 0;
      console.log(`   - ${code} : ${count} lignes`);
    });
    console.log('');

    // ========================================
    // SIMULATION DE LA RÉPONSE
    // ========================================
    console.log('📋 ÉTAPE 5 : Simulation de la réponse de l\'endpoint');
    console.log('-'.repeat(80));
    console.log('');

    const response = {
      departments: [
        {
          codeDepartement: `${commune.codeDepartement}-${commune.codeCommune}`,
          libelleDepartement: `ABIDJAN - ${commune.libelleCommune}`,
          nombreCelsAvecDonnees: celsFiltered.length,
          celsCodes: celsFiltered.map(c => c.codeCellule),
          totalLignesImport: importData.length
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    };

    console.log('📄 RÉPONSE SIMULÉE :');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    // ========================================
    // DIAGNOSTIC FINAL
    // ========================================
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSTIC FINAL');
    console.log('='.repeat(80));
    console.log('');

    if (communes.length > 0 && celsFiltered.length > 0 && importData.length > 0) {
      console.log('✅ L\'ENDPOINT DEVRAIT FONCTIONNER !');
      console.log('');
      console.log(`   Réponse attendue :`);
      console.log(`   - ${celsFiltered.length} CELs dans le tableau`);
      console.log(`   - ${importData.length} lignes de données agrégées`);
      console.log('');
      console.log('🔍 SI LE FRONTEND REÇOIT QUAND MÊME UN TABLEAU VIDE :');
      console.log('');
      console.log('   1️⃣ Vérifier l\'URL appelée par le frontend :');
      console.log('      ✅ Correct : GET /api/publications/communes/022-001/data');
      console.log('      ✅ Correct : GET /api/publications/communes/001/data');
      console.log('      ❌ Incorrect : GET /api/publications/departments/022-001/data');
      console.log('');
      console.log('   2️⃣ Vérifier les permissions :');
      console.log('      - Utilisateur SADMIN/ADMIN → Doit voir toutes les communes');
      console.log('      - Utilisateur USER → Doit avoir la commune 022-001 assignée');
      console.log('');
      console.log('   3️⃣ Vérifier le token JWT :');
      console.log('      - Token valide et non expiré');
      console.log('      - Token contient les bonnes informations de rôle');
      console.log('');
      console.log('   4️⃣ Regarder les logs du backend :');
      console.log('      - Activer le mode debug de Prisma');
      console.log('      - Vérifier les requêtes SQL générées');
    } else {
      console.log('⚠️ PROBLÈME DÉTECTÉ :');
      if (communes.length === 0) {
        console.log('   ❌ Commune non trouvée avec le filtre');
      } else if (celsFiltered.length === 0) {
        console.log('   ❌ Aucune CEL avec statut I ou P');
      } else if (importData.length === 0) {
        console.log('   ❌ Aucune donnée d\'import COMPLETED');
      }
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur lors du test :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testEndpointCommuneAbobo()
  .then(() => {
    console.log('');
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

