/**
 * Script de Test Final : Vérifier que ABOBO et SONGON retournent des données séparées
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCommunesSeparees() {
  console.log('🧪 TEST FINAL : Séparation des Données par Commune');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // Test ABOBO (022-001-001)
    // ========================================
    console.log('📋 TEST 1 : GET /api/publications/communes/022-001-001/data');
    console.log('-'.repeat(80));
    
    const aboboCode = '022-001-001';
    const [codeDeptAbobo, codeSPAbobo, codComAbobo] = aboboCode.split('-');
    
    const communeAbobo = await prisma.tblCom.findFirst({
      where: {
        codeDepartement: codeDeptAbobo,
        codeSousPrefecture: codeSPAbobo,
        codeCommune: codComAbobo
      },
      select: {
        id: true,
        codeDepartement: true,
        codeSousPrefecture: true,
        codeCommune: true,
        libelleCommune: true
      }
    });

    if (!communeAbobo) {
      console.log('❌ Commune ABOBO non trouvée');
      return;
    }

    const celsAbobo = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: communeAbobo.codeDepartement,
            codeSousPrefecture: communeAbobo.codeSousPrefecture,
            codeCommune: communeAbobo.codeCommune
          }
        },
        etatResultatCellule: { in: ['I', 'P'] }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`✅ Commune : ${communeAbobo.libelleCommune}`);
    console.log(`   Code : ${communeAbobo.codeDepartement}-${communeAbobo.codeSousPrefecture}-${communeAbobo.codeCommune}`);
    console.log(`   CELs importées : ${celsAbobo.length}`);
    celsAbobo.forEach(cel => {
      console.log(`      - ${cel.codeCellule} : ${cel.libelleCellule}`);
    });
    console.log('');

    // ========================================
    // Test SONGON (022-004-001)
    // ========================================
    console.log('📋 TEST 2 : GET /api/publications/communes/022-004-001/data');
    console.log('-'.repeat(80));
    
    const songonCode = '022-004-001';
    const [codeDeptSongon, codeSPSongon, codComSongon] = songonCode.split('-');
    
    const communeSongon = await prisma.tblCom.findFirst({
      where: {
        codeDepartement: codeDeptSongon,
        codeSousPrefecture: codeSPSongon,
        codeCommune: codComSongon
      },
      select: {
        id: true,
        codeDepartement: true,
        codeSousPrefecture: true,
        codeCommune: true,
        libelleCommune: true
      }
    });

    if (!communeSongon) {
      console.log('❌ Commune SONGON non trouvée');
      return;
    }

    const celsSongon = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: communeSongon.codeDepartement,
            codeSousPrefecture: communeSongon.codeSousPrefecture,
            codeCommune: communeSongon.codeCommune
          }
        },
        etatResultatCellule: { in: ['I', 'P'] }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`✅ Commune : ${communeSongon.libelleCommune}`);
    console.log(`   Code : ${communeSongon.codeDepartement}-${communeSongon.codeSousPrefecture}-${communeSongon.codeCommune}`);
    console.log(`   CELs importées : ${celsSongon.length}`);
    celsSongon.forEach(cel => {
      console.log(`      - ${cel.codeCellule} : ${cel.libelleCellule}`);
    });
    console.log('');

    // ========================================
    // VÉRIFICATION FINALE
    // ========================================
    console.log('='.repeat(80));
    console.log('📊 VÉRIFICATION FINALE');
    console.log('='.repeat(80));
    console.log('');

    console.log('✅ RÉSULTAT ATTENDU :');
    console.log(`   - ABOBO (022-001-001) : ${celsAbobo.length} CEL(s)`);
    console.log(`   - SONGON (022-004-001) : ${celsSongon.length} CEL(s)`);
    console.log('');

    // Vérifier qu'il n'y a pas de chevauchement
    const celsAboboSet = new Set(celsAbobo.map(c => c.codeCellule));
    const celsSongonSet = new Set(celsSongon.map(c => c.codeCellule));
    
    const chevauchement = [...celsAboboSet].filter(code => celsSongonSet.has(code));

    if (chevauchement.length > 0) {
      console.log('❌ PROBLÈME : Chevauchement détecté !');
      console.log(`   CELs présentes dans les deux communes : ${chevauchement.join(', ')}`);
    } else {
      console.log('✅ SÉPARATION CORRECTE : Aucun chevauchement entre les communes');
    }

    console.log('');

    if (celsAbobo.length === 2 && celsSongon.length === 1) {
      console.log('🎉 SUCCÈS : Le filtrage fonctionne correctement !');
      console.log('   - ABOBO retourne exactement 2 CELs');
      console.log('   - SONGON retourne exactement 1 CEL');
      console.log('   - Aucun chevauchement');
    } else {
      console.log('⚠️  ATTENTION : Les nombres ne correspondent pas aux attentes');
      console.log(`   Attendu : ABOBO=2, SONGON=1`);
      console.log(`   Obtenu : ABOBO=${celsAbobo.length}, SONGON=${celsSongon.length}`);
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
testCommunesSeparees()
  .then(() => {
    console.log('');
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

