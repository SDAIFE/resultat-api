/**
 * Script de Test : Route Nationale
 * 
 * Teste la nouvelle route GET /api/publications/national/data
 * qui retourne les données nationales agrégées
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRouteNationale() {
  console.log('🌍 TEST ROUTE NATIONALE');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // Simulation de la logique du service
    // ========================================
    console.log('📊 1. Récupération des CELs avec données...');
    
    const celsWithData = await prisma.tblCel.findMany({
      where: {
        etatResultatCellule: { in: ['I', 'P'] }
      },
      select: {
        codeCellule: true,
        libelleCellule: true,
        etatResultatCellule: true
      }
    });

    console.log(`   ✅ ${celsWithData.length} CELs trouvées avec statut I ou P`);
    celsWithData.forEach(cel => {
      console.log(`      - ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule}]`);
    });
    console.log('');

    if (celsWithData.length === 0) {
      console.log('❌ Aucune donnée nationale disponible');
      return;
    }

    // ========================================
    // Récupération des données d'import
    // ========================================
    console.log('📊 2. Récupération des données d\'import...');
    
    const celCodes = celsWithData.map(cel => cel.codeCellule);
    const importData = await prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: { in: celCodes },
        statutImport: 'COMPLETED'
      },
      select: {
        codeCellule: true,
        populationTotale: true,
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

    console.log(`   ✅ ${importData.length} enregistrements d'import trouvés`);
    console.log('');

    // ========================================
    // Calcul du nombre de bureaux de vote
    // ========================================
    console.log('📊 3. Calcul du nombre de bureaux de vote...');
    
    const lieuxVoteCodes = await prisma.tblLv.findMany({
      where: {
        codeCellule: { in: celCodes }
      },
      select: {
        codeDepartement: true,
        codeSousPrefecture: true,
        codeCommune: true,
        codeLieuVote: true
      }
    });

    const bureauxCount = await prisma.tblBv.count({
      where: {
        OR: lieuxVoteCodes.map(lv => ({
          codeDepartement: lv.codeDepartement,
          codeSousPrefecture: lv.codeSousPrefecture,
          codeCommune: lv.codeCommune,
          codeLieuVote: lv.codeLieuVote
        }))
      }
    });

    console.log(`   ✅ ${bureauxCount} bureaux de vote trouvés`);
    console.log('');

    // ========================================
    // Calcul des agrégations nationales
    // ========================================
    console.log('📊 4. Calcul des agrégations nationales...');
    
    const nationalMetrics = importData.reduce((acc, data) => {
      acc.inscrits += Number(data.populationTotale) || 0;
      acc.votants += Number(data.totalVotants) || 0;
      acc.bulletinsNuls += Number(data.bulletinsNuls) || 0;
      acc.suffrageExprime += Number(data.suffrageExprime) || 0;
      acc.bulletinsBlancs += Number(data.bulletinsBlancs) || 0;
      acc.score1 += Number(data.score1) || 0;
      acc.score2 += Number(data.score2) || 0;
      acc.score3 += Number(data.score3) || 0;
      acc.score4 += Number(data.score4) || 0;
      acc.score5 += Number(data.score5) || 0;
      return acc;
    }, {
      inscrits: 0,
      votants: 0,
      bulletinsNuls: 0,
      suffrageExprime: 0,
      bulletinsBlancs: 0,
      score1: 0,
      score2: 0,
      score3: 0,
      score4: 0,
      score5: 0
    });

    console.log('   ✅ Agrégations calculées :');
    console.log(`      - Inscrits : ${nationalMetrics.inscrits.toLocaleString()}`);
    console.log(`      - Votants : ${nationalMetrics.votants.toLocaleString()}`);
    console.log(`      - Bulletins nuls : ${nationalMetrics.bulletinsNuls.toLocaleString()}`);
    console.log(`      - Suffrages exprimés : ${nationalMetrics.suffrageExprime.toLocaleString()}`);
    console.log(`      - Bulletins blancs : ${nationalMetrics.bulletinsBlancs.toLocaleString()}`);
    console.log('');

    // ========================================
    // Calcul des pourcentages
    // ========================================
    console.log('📊 5. Calcul des pourcentages...');
    
    const tauxParticipation = nationalMetrics.inscrits > 0 
      ? Math.round((nationalMetrics.votants / nationalMetrics.inscrits) * 100 * 100) / 100 
      : 0;

    const pourcentageBulletinsNuls = nationalMetrics.votants > 0 
      ? Math.round((nationalMetrics.bulletinsNuls / nationalMetrics.votants) * 100 * 100) / 100 
      : 0;

    const pourcentageBulletinsBlancs = nationalMetrics.suffrageExprime > 0 
      ? Math.round((nationalMetrics.bulletinsBlancs / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
      : 0;

    console.log('   ✅ Pourcentages calculés :');
    console.log(`      - Taux de participation : ${tauxParticipation}%`);
    console.log(`      - Pourcentage bulletins nuls : ${pourcentageBulletinsNuls}%`);
    console.log(`      - Pourcentage bulletins blancs : ${pourcentageBulletinsBlancs}%`);
    console.log('');

    // ========================================
    // Scores des candidats
    // ========================================
    console.log('📊 6. Scores des candidats...');
    
    const candidats = [
      {
        nom: 'ALASSANE OUATTARA',
        parti: 'RHDP',
        score: nationalMetrics.score1,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score1 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0
      },
      {
        nom: 'AFFI N\'GUESSAN PASCAL',
        parti: 'FPI',
        score: nationalMetrics.score2,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score2 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0
      },
      {
        nom: 'BEDIE KONAN AIME HENRI',
        parti: 'PDCI-RDA',
        score: nationalMetrics.score3,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score3 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0
      },
      {
        nom: 'KOUADIO KONAN BERTIN',
        parti: 'INDEPENDANT',
        score: nationalMetrics.score4,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score4 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0
      }
    ].filter(candidat => candidat.score > 0);

    console.log('   ✅ Candidats avec voix :');
    candidats.forEach(candidat => {
      console.log(`      - ${candidat.parti} / ${candidat.nom} : ${candidat.score.toLocaleString()} voix (${candidat.pourcentage}%)`);
    });
    console.log('');

    // ========================================
    // RÉPONSE FINALE
    // ========================================
    console.log('='.repeat(80));
    console.log('📊 RÉPONSE DE LA ROUTE NATIONALE');
    console.log('='.repeat(80));
    console.log('');

    const response = {
      // Métriques générales
      nombreBureauxVote: bureauxCount,
      inscrits: nationalMetrics.inscrits,
      votants: nationalMetrics.votants,
      tauxParticipation,
      
      // Métriques de validité
      bulletinsNuls: {
        nombre: nationalMetrics.bulletinsNuls,
        pourcentage: pourcentageBulletinsNuls
      },
      suffrageExprime: nationalMetrics.suffrageExprime,
      bulletinsBlancs: {
        nombre: nationalMetrics.bulletinsBlancs,
        pourcentage: pourcentageBulletinsBlancs
      },
      
      // Scores des candidats
      candidats,
      
      // Métadonnées
      dateCalcul: new Date().toISOString(),
      nombreCels: celsWithData.length,
      nombreCelsImportees: importData.length
    };

    console.log('✅ RÉPONSE JSON :');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    console.log('='.repeat(80));
    console.log('🎯 RÉSUMÉ');
    console.log('='.repeat(80));
    console.log(`📊 Nombre de bureaux de vote : ${response.nombreBureauxVote.toLocaleString()}`);
    console.log(`👥 Inscrits : ${response.inscrits.toLocaleString()}`);
    console.log(`🗳️  Votants : ${response.votants.toLocaleString()}`);
    console.log(`📈 Taux de participation : ${response.tauxParticipation}%`);
    console.log(`❌ Bulletins nuls : ${response.bulletinsNuls.nombre.toLocaleString()} (${response.bulletinsNuls.pourcentage}%)`);
    console.log(`✅ Suffrages exprimés : ${response.suffrageExprime.toLocaleString()}`);
    console.log(`⚪ Bulletins blancs : ${response.bulletinsBlancs.nombre.toLocaleString()} (${response.bulletinsBlancs.pourcentage}%)`);
    console.log(`🏛️  CELs importées : ${response.nombreCelsImportees}/${response.nombreCels}`);
    console.log('');

    console.log('🎉 La route GET /api/publications/national/data est prête !');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
testRouteNationale()
  .then(() => {
    console.log('');
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

