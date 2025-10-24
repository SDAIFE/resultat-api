import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Script de réinitialisation de la base de données
 * 
 * Ce script réinitialise les données de vote et de publication
 * mais PRÉSERVE les données de référence (structure géographique, candidats, utilisateurs)
 * 
 * Tables supprimées (données de vote) :
 * - tblImportExcelCel (données CEL importées)
 * - tblProclamationResultat (résultats de proclamation)
 * - tblResultat (résultats électoraux)
 * 
 * Tables préservées (données de référence) :
 * - users, roles, sessions (authentification)
 * - tblReg, tblDept, tblSp, tblCom, tblLv, tblCel, tblBv, tblDst (structure géographique)
 * - tblCandidat, tblParrain (candidats et partis)
 * 
 * Champs réinitialisés :
 * - tblDept.statutPublication → NULL
 * - tblBv: personnesAstreintes, votantsHommes, votantsFemmes, totalVotants, tauxParticipation, bulletinsNuls, bulletinsBlancs, suffrageExprime → NULL
 * - tblCel.etatResultatCellule → NULL
 * 
 * Fichiers supprimés :
 * - Tous les fichiers dans le dossier uploads/
 */

/**
 * Supprimer tous les fichiers dans le dossier uploads/
 */
async function clearUploadsDirectory() {
  const uploadsPath = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadsPath)) {
    console.log('📁 Le dossier uploads/ n\'existe pas');
    return;
  }

  console.log('🗑️  Suppression des fichiers uploadés...');
  
  const subdirs = ['cels', 'consolidation', 'csv', 'excel'];
  let totalFilesDeleted = 0;

  for (const subdir of subdirs) {
    const subdirPath = path.join(uploadsPath, subdir);
    
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath);
      
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          fs.unlinkSync(filePath);
          totalFilesDeleted++;
        }
      }
      
      console.log(`   📂 ${subdir}/: ${files.length} fichier(s) supprimé(s)`);
    }
  }

  console.log(`✅ ${totalFilesDeleted} fichier(s) supprimé(s) du dossier uploads/`);
}

/**
 * Réinitialiser les champs de vote dans les tables préservées
 */
async function resetVoteFields() {
  console.log('🔄 Réinitialisation des champs de vote...');
  
  // Réinitialiser tblDept.statutPublication
  console.log('   📊 Réinitialisation de tblDept.statutPublication...');
  const deptUpdateResult = await prisma.tblDept.updateMany({
    data: {
      statutPublication: null
    }
  });
  console.log(`   ✅ ${deptUpdateResult.count} département(s) mis à jour`);
  
  // Réinitialiser les champs de vote dans tblBv
  console.log('   🗳️  Réinitialisation des champs de vote dans tblBv...');
  const bvUpdateResult = await prisma.tblBv.updateMany({
    data: {
      personnesAstreintes: null,
      votantsHommes: null,
      votantsFemmes: null,
      totalVotants: null,
      tauxParticipation: null,
      bulletinsNuls: null,
      bulletinsBlancs: null,
      suffrageExprime: null
    }
  });
  console.log(`   ✅ ${bvUpdateResult.count} bureau(x) de vote mis à jour`);
  
  // Réinitialiser tblCel.etatResultatCellule
  console.log('   🏛️  Réinitialisation de tblCel.etatResultatCellule...');
  const celUpdateResult = await prisma.tblCel.updateMany({
    data: {
      etatResultatCellule: null
    }
  });
  console.log(`   ✅ ${celUpdateResult.count} cellule(s) électorale(s) mise(s) à jour`);
}

async function resetDatabase() {
  try {
    console.log('🔄 Début de la réinitialisation de la base de données...');
    console.log('⚠️  Les données de référence seront préservées (structure géographique, candidats, utilisateurs)');
    
    // 1. Supprimer les fichiers uploadés
    await clearUploadsDirectory();
    
    // 2. Supprimer les tables de données de vote
    console.log('\n🗑️  Suppression des données de vote...');
    
    console.log('   📊 Suppression des données de publication...');
    await prisma.departmentPublicationHistory.deleteMany();
    
    console.log('   📊 Suppression des données d\'import Excel...');
    await prisma.tblImportExcelCel.deleteMany();
    
    console.log('   📊 Suppression des résultats de proclamation...');
    await prisma.tblProclamationResultat.deleteMany();
    
    console.log('   📊 Suppression des résultats électoraux...');
    await prisma.tblResultat.deleteMany();
    
    // 3. Réinitialiser les champs de vote dans les tables préservées
    console.log('\n🔄 Réinitialisation des champs de vote...');
    await resetVoteFields();
    
    console.log('\n✅ Base de données réinitialisée avec succès!');
    console.log('📊 Les données de vote ont été supprimées');
    console.log('🏗️  La structure géographique et les candidats ont été préservés');
    console.log('🔐 Les comptes utilisateurs et rôles ont été préservés');
    
    // Afficher les statistiques des données préservées
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const regionCount = await prisma.tblReg.count();
    const deptCount = await prisma.tblDept.count();
    const candidatCount = await prisma.tblCandidat.count();
    const parrainCount = await prisma.tblParrain.count();
    
    console.log('\n📈 Données préservées :');
    console.log(`   👥 ${userCount} utilisateur(s)`);
    console.log(`   🔑 ${roleCount} rôle(s)`);
    console.log(`   🗺️  ${regionCount} région(s)`);
    console.log(`   🏛️  ${deptCount} département(s)`);
    console.log(`   👤 ${candidatCount} candidat(s)`);
    console.log(`   🏛️  ${parrainCount} parrain(s)`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour exécuter le script
async function main() {
  try {
    await resetDatabase();
    console.log('🎉 Réinitialisation terminée avec succès!');
  } catch (error) {
    console.error('💥 Échec de la réinitialisation:', error);
    process.exit(1);
  }
}

// Exécuter seulement si ce script est appelé directement
if (require.main === module) {
  main();
}

export { resetDatabase };
