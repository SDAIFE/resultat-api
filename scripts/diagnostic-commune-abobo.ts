/**
 * Script de Diagnostic : Commune ABOBO (022-001)
 * 
 * Ce script vérifie si les données sont présentes pour la commune ABOBO
 * et diagnostique pourquoi le frontend reçoit un tableau vide
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticCommuneAbobo() {
  console.log('🔍 DIAGNOSTIC COMMUNE ABOBO (022-001)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========================================
    // ÉTAPE 1 : Vérifier la commune dans TblCom
    // ========================================
    console.log('📋 ÉTAPE 1 : Vérification de la commune dans TblCom');
    console.log('-'.repeat(80));
    
    const commune = await prisma.tblCom.findFirst({
      where: {
        codeDepartement: '022',
        codeCommune: '001'
      }
    });

    if (!commune) {
      console.log('❌ ERREUR : La commune 022-001 (ABOBO) n\'existe PAS dans TblCom');
      console.log('');
      
      // Chercher toutes les communes d'Abidjan pour diagnostic
      const communesAbidjan = await prisma.tblCom.findMany({
        where: { codeDepartement: '022' }
      });
      
      console.log(`📊 Communes d'Abidjan trouvées : ${communesAbidjan.length}`);
      communesAbidjan.forEach(c => {
        console.log(`   - ${c.codeDepartement}-${c.codeCommune} : ${c.libelleCommune}`);
      });
      
      return;
    }

    console.log('✅ Commune trouvée dans TblCom :');
    console.log(`   ID: ${commune.id}`);
    console.log(`   Code Département: ${commune.codeDepartement}`);
    console.log(`   Code Commune: ${commune.codeCommune}`);
    console.log(`   Libellé: ${commune.libelleCommune}`);
    console.log('');

    // ========================================
    // ÉTAPE 2 : Vérifier les lieux de vote
    // ========================================
    console.log('📋 ÉTAPE 2 : Vérification des lieux de vote (TblLv)');
    console.log('-'.repeat(80));
    
    const lieuxVote = await prisma.tblLv.findMany({
      where: {
        codeDepartement: '022',
        codeCommune: '001'
      }
    });

    console.log(`📊 Lieux de vote trouvés : ${lieuxVote.length}`);
    if (lieuxVote.length > 0) {
      console.log('   Exemples :');
      lieuxVote.slice(0, 5).forEach(lv => {
        console.log(`   - ${lv.codeDepartement}-${lv.codeSousPrefecture}-${lv.codeCommune}-${lv.codeLieuVote} : ${lv.libelleLieuVote}`);
      });
      if (lieuxVote.length > 5) {
        console.log(`   ... et ${lieuxVote.length - 5} autres`);
      }
    } else {
      console.log('⚠️  ATTENTION : Aucun lieu de vote trouvé pour cette commune');
    }
    console.log('');

    // ========================================
    // ÉTAPE 3 : Vérifier les CELs liées
    // ========================================
    console.log('📋 ÉTAPE 3 : Vérification des CELs liées à cette commune');
    console.log('-'.repeat(80));
    
    // Méthode 1 : Via la relation lieuxVote (ce que fait l'endpoint)
    const celsViaRelation = await prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: '022',
            codeCommune: '001'
          }
        }
      }
    });

    console.log(`📊 CELs trouvées via relation lieuxVote : ${celsViaRelation.length}`);
    if (celsViaRelation.length > 0) {
      celsViaRelation.forEach(cel => {
        console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [État: ${cel.etatResultatCellule}]`);
      });
    } else {
      console.log('❌ PROBLÈME : Aucune CEL trouvée via la relation lieuxVote');
      console.log('   Cela explique pourquoi le frontend reçoit un tableau vide !');
    }
    console.log('');

    // Méthode 2 : Vérifier toutes les CELs et voir si certaines matchent
    console.log('🔍 Recherche alternative : CELs contenant "ABOBO" dans le libellé');
    const celsAbobo = await prisma.tblCel.findMany({
      where: {
        libelleCellule: {
          contains: 'ABOBO'
        }
      }
    });

    console.log(`📊 CELs avec "ABOBO" dans le nom : ${celsAbobo.length}`);
    if (celsAbobo.length > 0) {
      celsAbobo.forEach(cel => {
        console.log(`   - ${cel.codeCellule} : ${cel.libelleCellule} [État: ${cel.etatResultatCellule}]`);
      });
    }
    console.log('');

    // ========================================
    // ÉTAPE 4 : Vérifier les imports Excel pour les CELs trouvées
    // ========================================
    if (celsViaRelation.length > 0) {
      console.log('📋 ÉTAPE 4 : Vérification des imports Excel');
      console.log('-'.repeat(80));
      
      const celCodes = celsViaRelation.map(c => c.codeCellule);
      
      const imports = await prisma.tblImportExcelCel.findMany({
        where: {
          codeCellule: { in: celCodes }
        }
      });

      console.log(`📊 Imports Excel trouvés : ${imports.length}`);
      
      // Grouper par CEL
      const importsByCel = new Map<string, number>();
      imports.forEach(imp => {
        const count = importsByCel.get(imp.codeCellule) || 0;
        importsByCel.set(imp.codeCellule, count + 1);
      });

      celCodes.forEach(code => {
        const count = importsByCel.get(code) || 0;
        const statut = celsViaRelation.find(c => c.codeCellule === code)?.etatResultatCellule;
        console.log(`   - ${code} : ${count} lignes importées [État CEL: ${statut}]`);
      });
      console.log('');

      // Vérifier les imports COMPLETED
      const importsCompleted = await prisma.tblImportExcelCel.findMany({
        where: {
          codeCellule: { in: celCodes },
          statutImport: 'COMPLETED'
        }
      });

      console.log(`📊 Imports avec statut COMPLETED : ${importsCompleted.length}`);
      
      const completedByCel = new Map<string, number>();
      importsCompleted.forEach(imp => {
        const count = completedByCel.get(imp.codeCellule) || 0;
        completedByCel.set(imp.codeCellule, count + 1);
      });

      celCodes.forEach(code => {
        const count = completedByCel.get(code) || 0;
        console.log(`   - ${code} : ${count} lignes COMPLETED`);
      });
      console.log('');
    }

    // ========================================
    // ÉTAPE 5 : Filtrer par statut I ou P
    // ========================================
    console.log('📋 ÉTAPE 5 : CELs avec statut I (Importé) ou P (Publié)');
    console.log('-'.repeat(80));
    
    const celsFiltered = celsViaRelation.filter(cel => 
      cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)
    );

    console.log(`📊 CELs avec statut I ou P : ${celsFiltered.length} / ${celsViaRelation.length}`);
    if (celsFiltered.length > 0) {
      celsFiltered.forEach(cel => {
        console.log(`   ✅ ${cel.codeCellule} : ${cel.libelleCellule} [${cel.etatResultatCellule}]`);
      });
    } else {
      console.log('❌ PROBLÈME : Aucune CEL avec statut I ou P !');
      console.log('   Les CELs doivent être importées (statut I) pour apparaître dans les résultats.');
      console.log('');
      console.log('   États actuels des CELs :');
      celsViaRelation.forEach(cel => {
        console.log(`   - ${cel.codeCellule} : État = ${cel.etatResultatCellule || 'NULL'}`);
      });
    }
    console.log('');

    // ========================================
    // ÉTAPE 6 : Vérifier les bureaux de vote
    // ========================================
    console.log('📋 ÉTAPE 6 : Vérification des bureaux de vote (TblBv)');
    console.log('-'.repeat(80));
    
    const bureauxVote = await prisma.tblBv.findMany({
      where: {
        codeDepartement: '022',
        codeCommune: '001'
      }
    });

    console.log(`📊 Bureaux de vote trouvés : ${bureauxVote.length}`);
    if (bureauxVote.length > 0) {
      console.log(`   Premiers 5 BV :`);
      bureauxVote.slice(0, 5).forEach(bv => {
        console.log(`   - ${bv.codeLieuVote}-${bv.numeroBureauVote} : ${bv.inscrits || 0} inscrits`);
      });
      if (bureauxVote.length > 5) {
        console.log(`   ... et ${bureauxVote.length - 5} autres`);
      }
    }
    console.log('');

    // ========================================
    // DIAGNOSTIC FINAL
    // ========================================
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSTIC FINAL');
    console.log('='.repeat(80));
    console.log('');

    console.log('✅ DONNÉES PRÉSENTES :');
    console.log(`   - Commune dans TblCom : ${commune ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Lieux de vote dans TblLv : ${lieuxVote.length > 0 ? `✅ ${lieuxVote.length} trouvés` : '❌ AUCUN'}`);
    console.log(`   - CELs liées (via relation) : ${celsViaRelation.length > 0 ? `✅ ${celsViaRelation.length} trouvées` : '❌ AUCUNE'}`);
    console.log(`   - CELs avec statut I ou P : ${celsFiltered.length > 0 ? `✅ ${celsFiltered.length} trouvées` : '❌ AUCUNE'}`);
    console.log(`   - Bureaux de vote : ${bureauxVote.length > 0 ? `✅ ${bureauxVote.length} trouvés` : '❌ AUCUN'}`);
    console.log('');

    if (celsViaRelation.length === 0) {
      console.log('🔴 CAUSE PROBABLE DU TABLEAU VIDE :');
      console.log('   Les CELs d\'ABOBO ne sont pas correctement liées aux lieux de vote.');
      console.log('   La requête de l\'endpoint utilise la relation lieuxVote pour filtrer,');
      console.log('   mais aucune CEL n\'est trouvée avec ce filtre.');
      console.log('');
      console.log('💡 SOLUTIONS POSSIBLES :');
      console.log('   1. Vérifier que les lieux de vote ont bien codeDepartement=022 et codeCommune=001');
      console.log('   2. Vérifier la relation entre TblCel et TblLv dans le schéma Prisma');
      console.log('   3. Exécuter le script de seed pour créer les relations');
    } else if (celsFiltered.length === 0) {
      console.log('🟡 CAUSE PROBABLE DU TABLEAU VIDE :');
      console.log('   Les CELs d\'ABOBO existent mais n\'ont pas le statut I (Importé) ou P (Publié).');
      console.log('   L\'endpoint filtre uniquement les CELs avec ces statuts.');
      console.log('');
      console.log('💡 SOLUTION :');
      console.log('   Uploader les fichiers Excel/CSV pour ces CELs via l\'endpoint /upload/excel');
    } else {
      console.log('🟢 TOUTES LES DONNÉES SONT PRÉSENTES !');
      console.log('   L\'endpoint devrait retourner les données.');
      console.log('');
      console.log('💡 Si le frontend reçoit quand même un tableau vide :');
      console.log('   1. Vérifier l\'URL exacte appelée par le frontend');
      console.log('   2. Vérifier les permissions de l\'utilisateur (rôle USER avec communes assignées ?)');
      console.log('   3. Vérifier les logs du backend pour voir les erreurs');
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le diagnostic
diagnosticCommuneAbobo()
  .then(() => {
    console.log('');
    console.log('✅ Diagnostic terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

