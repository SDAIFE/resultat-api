/**
 * Script de Peuplement : Tables Candidats
 * 
 * Peuple les tables TblParrain et TblCandidat avec les données
 * des candidats de l'élection présidentielle ivoirienne
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function peuplerTablesCandidats() {
  console.log('👥 PEUPLEMENT DES TABLES CANDIDATS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // 1. Créer les Parrains (Partis)
    // ========================================
    console.log('📋 1. Création des Parrains (Partis)...');
    
    const parrains = [
      {
        codeParrain: 'RHDP',
        libelleParrain: 'Rassemblement des Houphouëtistes pour la Démocratie et la Paix',
        sigle: 'RHDP'
      },
      {
        codeParrain: 'FPI',
        libelleParrain: 'Front Populaire Ivoirien',
        sigle: 'FPI'
      },
      {
        codeParrain: 'PDCI-RDA',
        libelleParrain: 'Parti Démocratique de Côte d\'Ivoire - Rassemblement Démocratique Africain',
        sigle: 'PDCI-RDA'
      },
      {
        codeParrain: 'INDEPENDANT',
        libelleParrain: 'Candidat Indépendant',
        sigle: 'INDEPENDANT'
      }
    ];

    for (const parrainData of parrains) {
      const parrain = await prisma.tblParrain.upsert({
        where: { codeParrain: parrainData.codeParrain },
        update: parrainData,
        create: parrainData
      });
      console.log(`   ✅ ${parrain.codeParrain} : ${parrain.libelleParrain}`);
    }
    console.log('');

    // ========================================
    // 2. Créer les Candidats
    // ========================================
    console.log('📋 2. Création des Candidats...');
    
    const candidats = [
      {
        numeroOrdre: '1',
        codeParrain: 'RHDP',
        nomCandidat: 'OUATTARA',
        prenomCandidat: 'ALASSANE',
        cheminPhoto: '/images/candidats/ouattara.jpg',
        cheminSymbole: '/images/symboles/rhdp.png'
      },
      {
        numeroOrdre: '2',
        codeParrain: 'FPI',
        nomCandidat: 'N\'GUESSAN',
        prenomCandidat: 'AFFI PASCAL',
        cheminPhoto: '/images/candidats/affi.jpg',
        cheminSymbole: '/images/symboles/fpi.png'
      },
      {
        numeroOrdre: '3',
        codeParrain: 'PDCI-RDA',
        nomCandidat: 'BEDIE',
        prenomCandidat: 'KONAN AIME HENRI',
        cheminPhoto: '/images/candidats/bedie.jpg',
        cheminSymbole: '/images/symboles/pdci-rda.png'
      },
      {
        numeroOrdre: '4',
        codeParrain: 'INDEPENDANT',
        nomCandidat: 'KOUADIO',
        prenomCandidat: 'KONAN BERTIN',
        cheminPhoto: '/images/candidats/kouadio.jpg',
        cheminSymbole: '/images/symboles/independant.png'
      }
    ];

    for (const candidatData of candidats) {
      const candidat = await prisma.tblCandidat.upsert({
        where: { numeroOrdre: candidatData.numeroOrdre },
        update: candidatData,
        create: candidatData
      });
      console.log(`   ✅ ${candidat.numeroOrdre} : ${candidat.prenomCandidat} ${candidat.nomCandidat} (${candidatData.codeParrain})`);
    }
    console.log('');

    // ========================================
    // 3. Vérification
    // ========================================
    console.log('📋 3. Vérification des données créées...');
    
    const parrainsCount = await prisma.tblParrain.count();
    const candidatsCount = await prisma.tblCandidat.count();
    
    console.log(`   📊 Parrains créés : ${parrainsCount}`);
    console.log(`   📊 Candidats créés : ${candidatsCount}`);
    console.log('');

    // Afficher les candidats avec leurs partis
    const candidatsAvecPartis = await prisma.tblCandidat.findMany({
      include: {
        parrain: true
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });

    console.log('   ✅ Candidats avec partis :');
    candidatsAvecPartis.forEach(candidat => {
      const parti = candidat.parrain ? candidat.parrain.sigle : 'INDEPENDANT';
      console.log(`      - ${candidat.numeroOrdre} : ${candidat.prenomCandidat} ${candidat.nomCandidat} (${parti})`);
    });
    console.log('');

    // ========================================
    // 4. PROCHAINES ÉTAPES
    // ========================================
    console.log('='.repeat(80));
    console.log('🎯 PROCHAINES ÉTAPES');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ TABLES CANDIDATS PEUPLÉES :');
    console.log('   - TblParrain : 4 partis créés');
    console.log('   - TblCandidat : 4 candidats créés');
    console.log('');
    console.log('🔧 MODIFICATIONS NÉCESSAIRES :');
    console.log('   1. Modifier getNationalData() pour utiliser TblCandidat');
    console.log('   2. Remplacer les noms hardcodés par les données de la table');
    console.log('   3. Ajouter les informations supplémentaires (photo, symbole)');
    console.log('   4. Optionnel : Créer les résultats dans TblResultat');
    console.log('');
    console.log('📊 AVANTAGES :');
    console.log('   - Données centralisées et cohérentes');
    console.log('   - Possibilité de modifier les candidats sans changer le code');
    console.log('   - Informations complètes (photo, symbole, parti)');
    console.log('   - Évolutif pour de futures élections');
    console.log('');

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
peuplerTablesCandidats()
  .then(() => {
    console.log('');
    console.log('✅ Peuplement terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

