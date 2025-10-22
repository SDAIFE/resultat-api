/**
 * Script de Mise à Jour : Tables Candidats avec Vraies Données
 * 
 * Met à jour les tables TblParrain et TblCandidat avec les vraies données
 * des fichiers CSV fournis
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mettreAJourTablesCandidats() {
  console.log('🔄 MISE À JOUR DES TABLES CANDIDATS AVEC VRAIES DONNÉES');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // 1. Supprimer les anciennes données
    // ========================================
    console.log('🗑️  1. Suppression des anciennes données...');
    
    await prisma.tblCandidat.deleteMany({});
    await prisma.tblParrain.deleteMany({});
    
    console.log('   ✅ Anciennes données supprimées');
    console.log('');

    // ========================================
    // 2. Créer les Parrains (Partis) avec vraies données
    // ========================================
    console.log('📋 2. Création des Parrains avec vraies données...');
    
    const parrains = [
      {
        id: 'cmgdps2zk0000i8p0ok1zb070',
        codeParrain: '01',
        libelleParrain: 'INDEPENDANT',
        sigle: 'INDEPENDANT'
      },
      {
        id: 'cmgdps33h0001i8p0m7zeu17k',
        codeParrain: '02',
        libelleParrain: 'RASSEMBLEMENT DES HOUPHOUETISTES POUR LA DÉMOCRATIE ET LA PAIX',
        sigle: 'RHDP'
      },
      {
        id: 'cmgdps3490002i8p0gmuiakky',
        codeParrain: '03',
        libelleParrain: 'MOUVEMENT DES GENERATIONS CAPABLES',
        sigle: 'MGC'
      },
      {
        id: 'cmgdps3530003i8p0uhecmll5',
        codeParrain: '04',
        libelleParrain: 'CONGRES DEMOCRATIQUE',
        sigle: 'CODE'
      },
      {
        id: 'cmgdps35u0004i8p0in6453n8',
        codeParrain: '05',
        libelleParrain: 'GROUPEMENT DES PARTENAIRES POLITIQUES POUR LA PAIX',
        sigle: 'GP-PAIX'
      }
    ];

    for (const parrainData of parrains) {
      const parrain = await prisma.tblParrain.create({
        data: parrainData
      });
      console.log(`   ✅ ${parrain.codeParrain} : ${parrain.libelleParrain} (${parrain.sigle})`);
    }
    console.log('');

    // ========================================
    // 3. Créer les Candidats avec vraies données
    // ========================================
    console.log('📋 3. Création des Candidats avec vraies données...');
    
    const candidats = [
      {
        id: 'cmgdps3yp0006i8p0ieb0bxel',
        numeroOrdre: '1',
        codeParrain: '02',
        nomCandidat: 'ALASSANE OUATTARA',
        prenomCandidat: 'ALASSANE',
        cheminPhoto: '/images/candidates/photo-alassane.jpg',
        cheminSymbole: '/images/candidates/logo-alassane.jpg'
      },
      {
        id: 'cmgdps4070008i8p014ivoq4x',
        numeroOrdre: '2',
        codeParrain: '03',
        nomCandidat: 'EHIVET SIMONE épouse GBAGBO',
        prenomCandidat: 'SIMONE',
        cheminPhoto: '/images/candidates/photo-simone.jpg',
        cheminSymbole: '/images/candidates/logo-simone.png'
      },
      {
        id: 'cmgdps418000ai8p00c6fku0j',
        numeroOrdre: '3',
        codeParrain: '05',
        nomCandidat: 'LAGOU ADJOUA HENRIETTE',
        prenomCandidat: 'HENRIETTE',
        cheminPhoto: '/images/candidates/photo-henriette.jpg',
        cheminSymbole: '/images/candidates/logo-henriette.jpg'
      },
      {
        id: 'cmgdps422000ci8p063sg2o7d',
        numeroOrdre: '4',
        codeParrain: '04',
        nomCandidat: 'BILLON JEAN-LOUIS EUGENE',
        prenomCandidat: 'JEAN-LOUIS',
        cheminPhoto: '/images/candidates/photo-jean-louis.jpg',
        cheminSymbole: '/images/candidates/logo-jean-louis.jpg'
      },
      {
        id: 'cmgdps42p000ei8p0k5tpyr4j',
        numeroOrdre: '5',
        codeParrain: '01',
        nomCandidat: 'DON-MELLO SENIN AHOUA JACOB',
        prenomCandidat: 'AHOUA',
        cheminPhoto: '/images/candidates/photo-ahoua.jpg',
        cheminSymbole: '/images/candidates/logo-ahoua.jpg'
      }
    ];

    for (const candidatData of candidats) {
      const candidat = await prisma.tblCandidat.create({
        data: candidatData
      });
      console.log(`   ✅ ${candidat.numeroOrdre} : ${candidat.prenomCandidat} ${candidat.nomCandidat}`);
    }
    console.log('');

    // ========================================
    // 4. Vérification des données créées
    // ========================================
    console.log('📋 4. Vérification des données créées...');
    
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
    // 5. IMPACT SUR LA ROUTE NATIONALE
    // ========================================
    console.log('='.repeat(80));
    console.log('🎯 IMPACT SUR LA ROUTE NATIONALE');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ DONNÉES MISES À JOUR :');
    console.log('   - 5 parrains au lieu de 4');
    console.log('   - 5 candidats au lieu de 4');
    console.log('   - Vrais noms et partis');
    console.log('   - Vraies photos et symboles');
    console.log('');
    console.log('🔧 MODIFICATIONS NÉCESSAIRES :');
    console.log('   1. Mettre à jour getNationalData() pour gérer 5 candidats');
    console.log('   2. Ajouter score5 dans les calculs');
    console.log('   3. Tester la route avec les nouvelles données');
    console.log('');
    console.log('📊 NOUVEAUX CANDIDATS :');
    console.log('   1. ALASSANE OUATTARA (RHDP)');
    console.log('   2. SIMONE GBAGBO (MGC)');
    console.log('   3. HENRIETTE LAGOU (GP-PAIX)');
    console.log('   4. JEAN-LOUIS BILLON (CODE)');
    console.log('   5. AHOUA DON-MELLO (INDEPENDANT)');
    console.log('');

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
mettreAJourTablesCandidats()
  .then(() => {
    console.log('');
    console.log('✅ Mise à jour terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

