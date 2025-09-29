import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script de réinitialisation de la base de données
 * 
 * Ce script supprime toutes les données des tables de données
 * mais PRÉSERVE les tables d'authentification (users, roles, sessions)
 * 
 * Tables supprimées :
 * - Toutes les tables TBL_* (données cartographiques et électorales)
 * - Tables d'import et de publication
 * 
 * Tables préservées :
 * - users
 * - roles  
 * - sessions
 */

async function resetDatabase() {
  try {
    console.log('🔄 Début de la réinitialisation de la base de données...');
    console.log('⚠️  Les tables users, roles et sessions seront préservées');
    
    // Ordre de suppression important : d'abord les tables avec des clés étrangères
    console.log('🗑️  Suppression des données de publication...');
    await prisma.departmentPublicationHistory.deleteMany();
    
    console.log('🗑️  Suppression des données d\'import Excel...');
    await prisma.tblImportExcelCel.deleteMany();
    
    console.log('🗑️  Suppression des résultats de proclamation...');
    await prisma.tblProclamationResultat.deleteMany();
    
    console.log('🗑️  Suppression des résultats électoraux...');
    await prisma.tblResultat.deleteMany();
    
    console.log('🗑️  Suppression des candidats...');
    await prisma.tblCandidat.deleteMany();
    
    console.log('🗑️  Suppression des parrains...');
    await prisma.tblParrain.deleteMany();
    
    console.log('🗑️  Suppression des bureaux de vote...');
    await prisma.tblBv.deleteMany();
    
    console.log('🗑️  Suppression des lieux de vote...');
    await prisma.tblLv.deleteMany();
    
    console.log('🗑️  Suppression des cellules électorales...');
    await prisma.tblCel.deleteMany();
    
    console.log('🗑️  Suppression des communes...');
    await prisma.tblCom.deleteMany();
    
    console.log('🗑️  Suppression des sous-préfectures...');
    await prisma.tblSp.deleteMany();
    
    console.log('🗑️  Suppression des départements...');
    await prisma.tblDept.deleteMany();
    
    console.log('🗑️  Suppression des régions...');
    await prisma.tblReg.deleteMany();
    
    console.log('🗑️  Suppression des districts...');
    await prisma.tblDst.deleteMany();
    
    console.log('✅ Base de données réinitialisée avec succès!');
    console.log('📊 Toutes les données cartographiques et électorales ont été supprimées');
    console.log('🔐 Les comptes utilisateurs et rôles ont été préservés');
    
    // Afficher le nombre d'utilisateurs préservés
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    console.log(`👥 ${userCount} utilisateurs préservés`);
    console.log(`🔑 ${roleCount} rôles préservés`);
    
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
