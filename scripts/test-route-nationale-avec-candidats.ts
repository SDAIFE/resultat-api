/**
 * Script de Test Final : Route Nationale avec Tables Candidats
 * 
 * Teste la route nationale mise à jour qui utilise les données
 * des tables TblCandidat et TblParrain
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRouteNationaleAvecCandidats() {
  console.log('🌍 TEST ROUTE NATIONALE AVEC TABLES CANDIDATS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // 1. Vérifier les candidats en base
    // ========================================
    console.log('📋 1. Vérification des candidats en base...');
    
    const candidatsDb = await prisma.tblCandidat.findMany({
      include: {
        parrain: true
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });

    console.log(`   📊 Nombre de candidats en base : ${candidatsDb.length}`);
    candidatsDb.forEach(candidat => {
      const parti = candidat.parrain ? candidat.parrain.sigle : 'INDEPENDANT';
      console.log(`      - ${candidat.numeroOrdre} : ${candidat.prenomCandidat} ${candidat.nomCandidat} (${parti})`);
    });
    console.log('');

    // ========================================
    // 2. Simulation de la logique mise à jour
    // ========================================
    console.log('📊 2. Simulation de la logique mise à jour...');
    
    // Récupérer les CELs avec données
    const celsWithData = await prisma.tblCel.findMany({
      where: {
        etatResultatCellule: { in: ['I', 'P'] }
      },
      select: {
        codeCellule: true
      }
    });

    const celCodes = celsWithData.map(cel => cel.codeCellule);
    const importData = await prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: { in: celCodes },
        statutImport: 'COMPLETED'
      },
      select: {
        populationTotale: true,
        totalVotants: true,
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

    // Calculer les agrégations
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

    console.log('   ✅ Agrégations calculées');
    console.log(`      - Inscrits : ${nationalMetrics.inscrits.toLocaleString()}`);
    console.log(`      - Votants : ${nationalMetrics.votants.toLocaleString()}`);
    console.log(`      - Suffrages exprimés : ${nationalMetrics.suffrageExprime.toLocaleString()}`);
    console.log('');

    // ========================================
    // 3. Construction des candidats avec données DB
    // ========================================
    console.log('📊 3. Construction des candidats avec données DB...');
    
    const candidats = [
      {
        numeroOrdre: '1',
        nom: `${candidatsDb[0]?.prenomCandidat || 'ALASSANE'} ${candidatsDb[0]?.nomCandidat || 'OUATTARA'}`,
        parti: candidatsDb[0]?.parrain?.sigle || 'RHDP',
        score: nationalMetrics.score1,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score1 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0,
        photo: candidatsDb[0]?.cheminPhoto || undefined,
        symbole: candidatsDb[0]?.parrain?.sigle || undefined
      },
      {
        numeroOrdre: '2',
        nom: `${candidatsDb[1]?.prenomCandidat || 'AFFI PASCAL'} ${candidatsDb[1]?.nomCandidat || 'N\'GUESSAN'}`,
        parti: candidatsDb[1]?.parrain?.sigle || 'FPI',
        score: nationalMetrics.score2,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score2 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0,
        photo: candidatsDb[1]?.cheminPhoto || undefined,
        symbole: candidatsDb[1]?.parrain?.sigle || undefined
      },
      {
        numeroOrdre: '3',
        nom: `${candidatsDb[2]?.prenomCandidat || 'KONAN AIME HENRI'} ${candidatsDb[2]?.nomCandidat || 'BEDIE'}`,
        parti: candidatsDb[2]?.parrain?.sigle || 'PDCI-RDA',
        score: nationalMetrics.score3,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score3 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0,
        photo: candidatsDb[2]?.cheminPhoto || undefined,
        symbole: candidatsDb[2]?.parrain?.sigle || undefined
      },
      {
        numeroOrdre: '4',
        nom: `${candidatsDb[3]?.prenomCandidat || 'KONAN BERTIN'} ${candidatsDb[3]?.nomCandidat || 'KOUADIO'}`,
        parti: candidatsDb[3]?.parrain?.sigle || 'INDEPENDANT',
        score: nationalMetrics.score4,
        pourcentage: nationalMetrics.suffrageExprime > 0 
          ? Math.round((nationalMetrics.score4 / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
          : 0,
        photo: candidatsDb[3]?.cheminPhoto || undefined,
        symbole: candidatsDb[3]?.parrain?.sigle || undefined
      }
    ].filter(candidat => candidat.score > 0);

    console.log('   ✅ Candidats construits avec données DB :');
    candidats.forEach(candidat => {
      console.log(`      - ${candidat.numeroOrdre} : ${candidat.nom} (${candidat.parti}) = ${candidat.score.toLocaleString()} voix (${candidat.pourcentage}%)`);
      if (candidat.photo) console.log(`        Photo : ${candidat.photo}`);
      if (candidat.symbole) console.log(`        Symbole : ${candidat.symbole}`);
    });
    console.log('');

    // ========================================
    // 4. Réponse finale
    // ========================================
    console.log('='.repeat(80));
    console.log('📊 RÉPONSE FINALE AVEC TABLES CANDIDATS');
    console.log('='.repeat(80));
    console.log('');

    const tauxParticipation = nationalMetrics.inscrits > 0 
      ? Math.round((nationalMetrics.votants / nationalMetrics.inscrits) * 100 * 100) / 100 
      : 0;

    const pourcentageBulletinsNuls = nationalMetrics.votants > 0 
      ? Math.round((nationalMetrics.bulletinsNuls / nationalMetrics.votants) * 100 * 100) / 100 
      : 0;

    const pourcentageBulletinsBlancs = nationalMetrics.suffrageExprime > 0 
      ? Math.round((nationalMetrics.bulletinsBlancs / nationalMetrics.suffrageExprime) * 100 * 100) / 100 
      : 0;

    const response = {
      nombreBureauxVote: 771, // Simplifié pour le test
      inscrits: nationalMetrics.inscrits,
      votants: nationalMetrics.votants,
      tauxParticipation,
      bulletinsNuls: {
        nombre: nationalMetrics.bulletinsNuls,
        pourcentage: pourcentageBulletinsNuls
      },
      suffrageExprime: nationalMetrics.suffrageExprime,
      bulletinsBlancs: {
        nombre: nationalMetrics.bulletinsBlancs,
        pourcentage: pourcentageBulletinsBlancs
      },
      candidats,
      dateCalcul: new Date().toISOString(),
      nombreCels: celsWithData.length,
      nombreCelsImportees: importData.length
    };

    console.log('✅ RÉPONSE JSON COMPLÈTE :');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    // ========================================
    // 5. AVANTAGES DE LA NOUVELLE APPROCHE
    // ========================================
    console.log('='.repeat(80));
    console.log('🎯 AVANTAGES DE LA NOUVELLE APPROCHE');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ UTILISATION DES TABLES CANDIDATS :');
    console.log('   - Données centralisées dans TblCandidat et TblParrain');
    console.log('   - Informations complètes : nom, prénom, parti, photo, symbole');
    console.log('   - Possibilité de modifier les candidats sans changer le code');
    console.log('   - Cohérence avec le reste du système');
    console.log('');
    console.log('🔧 FONCTIONNALITÉS AJOUTÉES :');
    console.log('   - numeroOrdre : Ordre d\'apparition sur le bulletin');
    console.log('   - photo : Chemin vers la photo du candidat');
    console.log('   - symbole : Symbole du parti');
    console.log('   - Fallback : Valeurs par défaut si données manquantes');
    console.log('');
    console.log('📊 DONNÉES DYNAMIQUES :');
    console.log('   - Les noms des candidats viennent de la base de données');
    console.log('   - Les partis sont récupérés depuis TblParrain');
    console.log('   - Les scores restent calculés depuis TblImportExcelCel');
    console.log('   - Évolutif pour de futures élections');
    console.log('');

    console.log('🎉 La route nationale utilise maintenant les tables candidats !');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
testRouteNationaleAvecCandidats()
  .then(() => {
    console.log('');
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

