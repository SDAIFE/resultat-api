/**
 * Script de Diagnostic : Filtrage des CELs par Commune
 * 
 * Vérifie pourquoi ABOBO (022-001-001) et SONGON (022-004-001) 
 * retournent toutes les 3 CELs au lieu de 2 et 1 respectivement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticFiltrageCommunes() {
  console.log('🔍 DIAGNOSTIC FILTRAGE CELs PAR COMMUNE');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // Test 1 : ABOBO (022-001-001)
    // ========================================
    console.log('📋 TEST 1 : COMMUNE ABOBO (022-001-001)');
    console.log('-'.repeat(80));
    console.log('');

    const abobo = await prisma.tblCom.findFirst({
      where: {
        codeDepartement: '022',
        codeSousPrefecture: '001',
        codeCommune: '001'
      }
    });

    if (!abobo) {
      console.log('❌ Commune ABOBO non trouvée');
      return;
    }

    console.log(`✅ Commune trouvée : ${abobo.libelleCommune}`);
    console.log(`   codeDepartement: ${abobo.codeDepartement}`);
    console.log(`   codeSousPrefecture: ${abobo.codeSousPrefecture}`);
    console.log(`   codeCommune: ${abobo.codeCommune}`);
    console.log('');

    // Récupérer les CELs comme le fait l'endpoint
    const celsAbobo = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: abobo.codeDepartement,
            codeCommune: abobo.codeCommune
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`📊 CELs trouvées avec filtrage actuel : ${celsAbobo.length}`);
    celsAbobo.forEach(cel => {
      console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule || 'null'}]`);
    });
    console.log('');

    // Récupérer avec codeSousPrefecture
    const celsAboboAvecSP = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: abobo.codeDepartement,
            codeSousPrefecture: abobo.codeSousPrefecture,
            codeCommune: abobo.codeCommune
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`🔍 CELs avec filtrage COMPLET (+ codeSousPrefecture) : ${celsAboboAvecSP.length}`);
    celsAboboAvecSP.forEach(cel => {
      console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule || 'null'}]`);
    });
    console.log('');

    // Filtrer par statut I ou P
    const celsAboboImportees = celsAboboAvecSP.filter(c => 
      c.etatResultatCellule && ['I', 'P'].includes(c.etatResultatCellule)
    );
    console.log(`✅ CELs ABOBO avec statut I ou P : ${celsAboboImportees.length}`);
    celsAboboImportees.forEach(cel => {
      console.log(`   ✅ ${cel.codeCellule} : ${cel.libelleCellule}`);
    });
    console.log('');

    // ========================================
    // Test 2 : SONGON (022-004-001)
    // ========================================
    console.log('📋 TEST 2 : COMMUNE SONGON (022-004-001)');
    console.log('-'.repeat(80));
    console.log('');

    const songon = await prisma.tblCom.findFirst({
      where: {
        codeDepartement: '022',
        codeSousPrefecture: '004',
        codeCommune: '001'
      }
    });

    if (!songon) {
      console.log('❌ Commune SONGON non trouvée');
      return;
    }

    console.log(`✅ Commune trouvée : ${songon.libelleCommune}`);
    console.log(`   codeDepartement: ${songon.codeDepartement}`);
    console.log(`   codeSousPrefecture: ${songon.codeSousPrefecture}`);
    console.log(`   codeCommune: ${songon.codeCommune}`);
    console.log('');

    // Récupérer les CELs comme le fait l'endpoint (SANS codeSousPrefecture)
    const celsSongon = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: songon.codeDepartement,
            codeCommune: songon.codeCommune
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`📊 CELs trouvées avec filtrage actuel : ${celsSongon.length}`);
    celsSongon.forEach(cel => {
      console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule || 'null'}]`);
    });
    console.log('');

    // Récupérer avec codeSousPrefecture
    const celsSongonAvecSP = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: songon.codeDepartement,
            codeSousPrefecture: songon.codeSousPrefecture,
            codeCommune: songon.codeCommune
          }
        }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`🔍 CELs avec filtrage COMPLET (+ codeSousPrefecture) : ${celsSongonAvecSP.length}`);
    celsSongonAvecSP.forEach(cel => {
      console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule || 'null'}]`);
    });
    console.log('');

    // Filtrer par statut I ou P
    const celsSongonImportees = celsSongonAvecSP.filter(c => 
      c.etatResultatCellule && ['I', 'P'].includes(c.etatResultatCellule)
    );
    console.log(`✅ CELs SONGON avec statut I ou P : ${celsSongonImportees.length}`);
    celsSongonImportees.forEach(cel => {
      console.log(`   ✅ ${cel.codeCellule} : ${cel.libelleCellule}`);
    });
    console.log('');

    // ========================================
    // DIAGNOSTIC FINAL
    // ========================================
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSTIC FINAL');
    console.log('='.repeat(80));
    console.log('');

    console.log('🔴 PROBLÈME IDENTIFIÉ :');
    console.log('   Le filtrage actuel utilise SEULEMENT codeDepartement + codeCommune');
    console.log('   Il manque le filtre sur codeSousPrefecture !');
    console.log('');
    console.log('   Résultat :');
    console.log(`   - ABOBO (022-001-001) retourne ${celsAbobo.length} CELs au lieu de ${celsAboboAvecSP.length}`);
    console.log(`   - SONGON (022-004-001) retourne ${celsSongon.length} CELs au lieu de ${celsSongonAvecSP.length}`);
    console.log('');
    console.log('✅ SOLUTION :');
    console.log('   Ajouter codeSousPrefecture dans le filtre WHERE :');
    console.log('');
    console.log('   where: {');
    console.log('     lieuxVote: {');
    console.log('       some: {');
    console.log('         codeDepartement: commune.codeDepartement,');
    console.log('         codeSousPrefecture: commune.codeSousPrefecture,  // ✅ À AJOUTER');
    console.log('         codeCommune: commune.codeCommune');
    console.log('       }');
    console.log('     }');
    console.log('   }');
    console.log('');

    console.log('📊 RÉSUMÉ :');
    console.log(`   ABOBO (022-001-001) : ${celsAboboImportees.length} CEL(s) avec données`);
    console.log(`   SONGON (022-004-001) : ${celsSongonImportees.length} CEL(s) avec données`);
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
diagnosticFiltrageCommunes()
  .then(() => {
    console.log('');
    console.log('✅ Diagnostic terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

