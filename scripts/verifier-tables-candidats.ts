/**
 * Script de Vérification : Tables Candidats et Résultats
 * 
 * Vérifie si les tables TblCandidat, TblParrain et TblResultat contiennent des données
 * et comment elles sont structurées
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifierTablesCandidats() {
  console.log('🔍 VÉRIFICATION DES TABLES CANDIDATS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // 1. Vérifier TblParrain
    // ========================================
    console.log('📋 1. TABLE TBL_PARRAIN (Partis/Parrains)');
    console.log('-'.repeat(80));
    
    const parrains = await prisma.tblParrain.findMany({
      select: {
        id: true,
        codeParrain: true,
        libelleParrain: true,
        sigle: true,
        _count: {
          select: {
            candidats: true
          }
        }
      }
    });

    console.log(`   📊 Nombre de parrains : ${parrains.length}`);
    if (parrains.length > 0) {
      console.log('   ✅ Parrains trouvés :');
      parrains.forEach(parrain => {
        console.log(`      - ${parrain.codeParrain} : ${parrain.libelleParrain} (${parrain.sigle || 'N/A'}) - ${parrain._count.candidats} candidat(s)`);
      });
    } else {
      console.log('   ❌ Aucun parrain trouvé');
    }
    console.log('');

    // ========================================
    // 2. Vérifier TblCandidat
    // ========================================
    console.log('📋 2. TABLE TBL_CANDIDAT');
    console.log('-'.repeat(80));
    
    const candidats = await prisma.tblCandidat.findMany({
      select: {
        id: true,
        numeroOrdre: true,
        codeParrain: true,
        nomCandidat: true,
        prenomCandidat: true,
        cheminPhoto: true,
        cheminSymbole: true,
        parrain: {
          select: {
            libelleParrain: true,
            sigle: true
          }
        },
        _count: {
          select: {
            resultats: true
          }
        }
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });

    console.log(`   📊 Nombre de candidats : ${candidats.length}`);
    if (candidats.length > 0) {
      console.log('   ✅ Candidats trouvés :');
      candidats.forEach(candidat => {
        const parti = candidat.parrain ? `${candidat.parrain.sigle || candidat.parrain.libelleParrain}` : 'INDEPENDANT';
        console.log(`      - ${candidat.numeroOrdre} : ${candidat.prenomCandidat} ${candidat.nomCandidat} (${parti}) - ${candidat._count.resultats} résultat(s)`);
      });
    } else {
      console.log('   ❌ Aucun candidat trouvé');
    }
    console.log('');

    // ========================================
    // 3. Vérifier TblResultat
    // ========================================
    console.log('📋 3. TABLE TBL_RESULTAT');
    console.log('-'.repeat(80));
    
    const resultatsCount = await prisma.tblResultat.count();
    console.log(`   📊 Nombre total de résultats : ${resultatsCount.toLocaleString()}`);

    if (resultatsCount > 0) {
      // Échantillon de résultats
      const resultatsEchantillon = await prisma.tblResultat.findMany({
        take: 5,
        select: {
          numeroResultat: true,
          numeroOrdreCandidat: true,
          score: true,
          candidat: {
            select: {
              nomCandidat: true,
              prenomCandidat: true,
              parrain: {
                select: {
                  sigle: true
                }
              }
            }
          }
        }
      });

      console.log('   ✅ Échantillon de résultats :');
      resultatsEchantillon.forEach(resultat => {
        const parti = resultat.candidat.parrain?.sigle || 'INDEPENDANT';
        console.log(`      - ${resultat.numeroResultat} : ${resultat.candidat.prenomCandidat} ${resultat.candidat.nomCandidat} (${parti}) = ${resultat.score} voix`);
      });

      // Statistiques par candidat
      const statsParCandidat = await prisma.tblResultat.groupBy({
        by: ['numeroOrdreCandidat'],
        _sum: {
          score: true
        },
        _count: {
          numeroResultat: true
        }
      });

      console.log('');
      console.log('   📊 Statistiques par candidat :');
      for (const stat of statsParCandidat) {
        const candidat = candidats.find(c => c.numeroOrdre === stat.numeroOrdreCandidat);
        if (candidat) {
          const parti = candidat.parrain ? `${candidat.parrain.sigle || candidat.parrain.libelleParrain}` : 'INDEPENDANT';
          console.log(`      - ${stat.numeroOrdreCandidat} : ${candidat.prenomCandidat} ${candidat.nomCandidat} (${parti}) = ${stat._sum.score?.toLocaleString() || 0} voix total`);
        }
      }
    } else {
      console.log('   ❌ Aucun résultat trouvé');
    }
    console.log('');

    // ========================================
    // 4. Comparaison avec TblImportExcelCel
    // ========================================
    console.log('📋 4. COMPARAISON AVEC TBL_IMPORT_EXCEL_CEL');
    console.log('-'.repeat(80));
    
    const importData = await prisma.tblImportExcelCel.findMany({
      where: {
        statutImport: 'COMPLETED'
      },
      select: {
        score1: true,
        score2: true,
        score3: true,
        score4: true,
        score5: true
      },
      take: 5
    });

    console.log(`   📊 Échantillon de données d'import (${importData.length} enregistrements) :`);
    importData.forEach((data, index) => {
      console.log(`      Enregistrement ${index + 1} :`);
      console.log(`         Score1: ${data.score1}, Score2: ${data.score2}, Score3: ${data.score3}, Score4: ${data.score4}, Score5: ${data.score5}`);
    });
    console.log('');

    // ========================================
    // 5. RECOMMANDATIONS
    // ========================================
    console.log('='.repeat(80));
    console.log('🎯 RECOMMANDATIONS');
    console.log('='.repeat(80));
    console.log('');

    if (candidats.length > 0 && resultatsCount > 0) {
      console.log('✅ UTILISER LES TABLES CANDIDATS :');
      console.log('   - Les tables TblCandidat et TblResultat contiennent des données');
      console.log('   - Nous pouvons remplacer les scores hardcodés par des données dynamiques');
      console.log('   - Avantages :');
      console.log('     * Informations complètes des candidats (nom, prénom, parti, photo)');
      console.log('     * Scores réels depuis TblResultat');
      console.log('     * Flexibilité pour ajouter/modifier des candidats');
      console.log('     * Cohérence avec le reste du système');
      console.log('');
      console.log('🔧 MODIFICATIONS NÉCESSAIRES :');
      console.log('   1. Modifier getNationalData() pour utiliser TblResultat');
      console.log('   2. Joindre avec TblCandidat pour les informations complètes');
      console.log('   3. Calculer les scores par candidat depuis TblResultat');
      console.log('   4. Mettre à jour le DTO pour inclure les infos candidats');
    } else {
      console.log('⚠️  TABLES CANDIDATS VIDES :');
      console.log('   - Les tables TblCandidat et TblResultat sont vides');
      console.log('   - Nous devons continuer avec les scores hardcodés');
      console.log('   - Ou bien peupler ces tables avec les données des candidats');
      console.log('');
      console.log('🔧 OPTIONS :');
      console.log('   1. Garder les scores hardcodés (solution actuelle)');
      console.log('   2. Créer un script pour peupler TblCandidat et TblParrain');
      console.log('   3. Modifier l\'import Excel pour créer les résultats dans TblResultat');
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
verifierTablesCandidats()
  .then(() => {
    console.log('');
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

