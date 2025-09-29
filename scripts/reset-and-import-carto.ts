import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Script combiné : Réinitialisation + Import des données cartographiques
 * 
 * Ce script :
 * 1. Génère le client Prisma (après les modifications du schéma)
 * 2. Réinitialise la base de données (préserve users, roles, sessions)
 * 3. Importe toutes les données cartographiques dans l'ordre correct
 */

async function generatePrismaClient() {
  console.log('🔧 Génération du client Prisma...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Client Prisma généré avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la génération du client Prisma:', error);
    throw error;
  }
}

async function resetDatabase() {
  console.log('🔄 Réinitialisation de la base de données...');
  
  try {
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
    
    // Afficher le nombre d'utilisateurs préservés
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    console.log(`👥 ${userCount} utilisateurs préservés`);
    console.log(`🔑 ${roleCount} rôles préservés`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    throw error;
  }
}

// Interfaces pour les données
interface DistrictData {
  COD_DST: string;
  LIB_DST: string;
  CHEF_LIEU: string;
}

interface RegionData {
  COD_REG: string;
  LIB_REG: string;
  COD_DST?: string;
}

interface DepartmentData {
  COD_DEPT: string;
  COD_REG: string;
  NUM_UTIL: string;
  STAT_PUB: string;
  LIB_DEPT: string;
}

interface SubPrefectureData {
  COD_DEPT: string;
  COD_SP: string;
  LIB_SP: string;
}

interface CommuneData {
  COD_DEPT: string;
  COD_SP: string;
  COD_COM: string;
  LIB_COM: string;
}

interface LieuVoteData {
  COD_DEPT: string;
  COD_SP: string;
  COD_COM: string;
  COD_LV: string;
  COD_CEL?: string;
  LIB_LV: string;
}

interface BureauVoteData {
  COD_DEPT: string;
  COD_SP: string;
  COD_COM: string;
  COD_LV: string;
  NUMERO_BV: string;
  INSCRITS?: string;
  POP_HOM?: string;
  POP_FEM?: string;
  PERS_ASTR?: string;
  VOT_HOM?: string;
  VOT_FEM?: string;
  TOTAL_VOT?: string;
  TAUX_PART?: string;
  BUL_NUL?: string;
  BUL_BLANC?: string;
  SUF_EXP?: string;
}

interface CelData {
  COD_CEL: string;
  TYP_CEL: string;
  LIGNE_DEB_CEL: string;
  ETA_RESULTAT_CEL: string;
  NBR_BV_CEL: string;
  LIB_CEL: string;
  NUM_UTIL: string;
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(';');
  
  return lines.slice(1).map(line => {
    const values = line.split(';');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    return obj;
  });
}

async function importDistricts() {
  console.log('🌍 Import des districts...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/1-tbl_dst.csv'), 'utf-8');
  const data = parseCSV(content) as DistrictData[];
  
  for (const district of data) {
    await prisma.tblDst.upsert({
      where: { codeDistrict: district.COD_DST },
      update: {
        libelleDistrict: district.LIB_DST,
        chefLieu: district.CHEF_LIEU || null,
      },
      create: {
        codeDistrict: district.COD_DST,
        libelleDistrict: district.LIB_DST,
        chefLieu: district.CHEF_LIEU || null,
      },
    });
  }
  
  console.log(`✅ ${data.length} districts importés`);
}

async function importRegions() {
  console.log('🌍 Import des régions...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/2-tbl_reg.csv'), 'utf-8');
  const data = parseCSV(content) as RegionData[];
  
  for (const region of data) {
    await prisma.tblReg.upsert({
      where: { codeRegion: region.COD_REG },
      update: {
        libelleRegion: region.LIB_REG,
        codeDistrict: region.COD_DST || null,
      },
      create: {
        codeRegion: region.COD_REG,
        libelleRegion: region.LIB_REG,
        codeDistrict: region.COD_DST || null,
      },
    });
  }
  
  console.log(`✅ ${data.length} régions importées`);
}

async function importDepartments() {
  console.log('🏛️ Import des départements...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/3-tbl_dept.csv'), 'utf-8');
  const data = parseCSV(content) as DepartmentData[];
  
  // Récupérer les utilisateurs existants
  const existingUsers = await prisma.user.findMany({
    select: { id: true }
  });
  const userIds = existingUsers.map(u => u.id);
  
  for (const dept of data) {
    // Vérifier si l'utilisateur existe, sinon mettre null
    const numeroUtilisateur = dept.NUM_UTIL && userIds.includes(dept.NUM_UTIL) 
      ? dept.NUM_UTIL 
      : null;
    
    await prisma.tblDept.upsert({
      where: { codeDepartement: dept.COD_DEPT },
      update: {
        codeRegion: dept.COD_REG,
        numeroUtilisateur: numeroUtilisateur,
        statutPublication: dept.STAT_PUB || null,
        libelleDepartement: dept.LIB_DEPT,
      },
      create: {
        codeDepartement: dept.COD_DEPT,
        codeRegion: dept.COD_REG,
        numeroUtilisateur: numeroUtilisateur,
        statutPublication: dept.STAT_PUB || null,
        libelleDepartement: dept.LIB_DEPT,
      },
    });
  }
  
  console.log(`✅ ${data.length} départements importés`);
}

async function importSubPrefectures() {
  console.log('🏘️ Import des sous-préfectures...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/4-tbl_sp.csv'), 'utf-8');
  const data = parseCSV(content) as SubPrefectureData[];
  
  for (const sp of data) {
    await prisma.tblSp.upsert({
      where: { 
        codeDepartement_codeSousPrefecture: {
          codeDepartement: sp.COD_DEPT,
          codeSousPrefecture: sp.COD_SP,
        }
      },
      update: {
        libelleSousPrefecture: sp.LIB_SP,
      },
      create: {
        codeDepartement: sp.COD_DEPT,
        codeSousPrefecture: sp.COD_SP,
        libelleSousPrefecture: sp.LIB_SP,
      },
    });
  }
  
  console.log(`✅ ${data.length} sous-préfectures importées`);
}

async function importCommunes() {
  console.log('🏘️ Import des communes...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/5-tbl_com.csv'), 'utf-8');
  const data = parseCSV(content) as CommuneData[];
  
  for (const com of data) {
    await prisma.tblCom.upsert({
      where: {
        codeDepartement_codeSousPrefecture_codeCommune: {
          codeDepartement: com.COD_DEPT,
          codeSousPrefecture: com.COD_SP,
          codeCommune: com.COD_COM,
        }
      },
      update: {
        libelleCommune: com.LIB_COM,
      },
      create: {
        codeDepartement: com.COD_DEPT,
        codeSousPrefecture: com.COD_SP,
        codeCommune: com.COD_COM,
        libelleCommune: com.LIB_COM,
      },
    });
  }
  
  console.log(`✅ ${data.length} communes importées`);
}

async function importLieuxVote() {
  console.log('🏛️ Import des lieux de vote...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/7-tbl_lv.csv'), 'utf-8');
  const data = parseCSV(content) as LieuVoteData[];
  
  for (const lv of data) {
    await prisma.tblLv.upsert({
      where: {
        codeDepartement_codeSousPrefecture_codeCommune_codeLieuVote: {
          codeDepartement: lv.COD_DEPT,
          codeSousPrefecture: lv.COD_SP,
          codeCommune: lv.COD_COM,
          codeLieuVote: lv.COD_LV,
        }
      },
      update: {
        codeCellule: lv.COD_CEL || null,
        libelleLieuVote: lv.LIB_LV,
      },
      create: {
        codeDepartement: lv.COD_DEPT,
        codeSousPrefecture: lv.COD_SP,
        codeCommune: lv.COD_COM,
        codeLieuVote: lv.COD_LV,
        codeCellule: lv.COD_CEL || null,
        libelleLieuVote: lv.LIB_LV,
      },
    });
  }
  
  console.log(`✅ ${data.length} lieux de vote importés`);
}

async function importBureauxVote() {
  console.log('🗳️ Import des bureaux de vote...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/8-tbl_bv.csv'), 'utf-8');
  const data = parseCSV(content) as BureauVoteData[];
  
  for (const bv of data) {
    await prisma.tblBv.upsert({
      where: {
        codeDepartement_codeSousPrefecture_codeCommune_codeLieuVote_numeroBureauVote: {
          codeDepartement: bv.COD_DEPT,
          codeSousPrefecture: bv.COD_SP,
          codeCommune: bv.COD_COM,
          codeLieuVote: bv.COD_LV,
          numeroBureauVote: bv.NUMERO_BV,
        }
      },
      update: {
        inscrits: bv.INSCRITS ? parseInt(bv.INSCRITS) : null,
        populationHommes: bv.POP_HOM ? parseInt(bv.POP_HOM) : null,
        populationFemmes: bv.POP_FEM ? parseInt(bv.POP_FEM) : null,
        personnesAstreintes: bv.PERS_ASTR ? parseInt(bv.PERS_ASTR) : null,
        votantsHommes: bv.VOT_HOM ? parseInt(bv.VOT_HOM) : null,
        votantsFemmes: bv.VOT_FEM ? parseInt(bv.VOT_FEM) : null,
        totalVotants: bv.TOTAL_VOT ? parseInt(bv.TOTAL_VOT) : null,
        tauxParticipation: bv.TAUX_PART ? parseFloat(bv.TAUX_PART) : null,
        bulletinsNuls: bv.BUL_NUL ? parseInt(bv.BUL_NUL) : null,
        bulletinsBlancs: bv.BUL_BLANC ? parseInt(bv.BUL_BLANC) : null,
        suffrageExprime: bv.SUF_EXP || null,
      },
      create: {
        codeDepartement: bv.COD_DEPT,
        codeSousPrefecture: bv.COD_SP,
        codeCommune: bv.COD_COM,
        codeLieuVote: bv.COD_LV,
        numeroBureauVote: bv.NUMERO_BV,
        inscrits: bv.INSCRITS ? parseInt(bv.INSCRITS) : null,
        populationHommes: bv.POP_HOM ? parseInt(bv.POP_HOM) : null,
        populationFemmes: bv.POP_FEM ? parseInt(bv.POP_FEM) : null,
        personnesAstreintes: bv.PERS_ASTR ? parseInt(bv.PERS_ASTR) : null,
        votantsHommes: bv.VOT_HOM ? parseInt(bv.VOT_HOM) : null,
        votantsFemmes: bv.VOT_FEM ? parseInt(bv.VOT_FEM) : null,
        totalVotants: bv.TOTAL_VOT ? parseInt(bv.TOTAL_VOT) : null,
        tauxParticipation: bv.TAUX_PART ? parseFloat(bv.TAUX_PART) : null,
        bulletinsNuls: bv.BUL_NUL ? parseInt(bv.BUL_NUL) : null,
        bulletinsBlancs: bv.BUL_BLANC ? parseInt(bv.BUL_BLANC) : null,
        suffrageExprime: bv.SUF_EXP || null,
      },
    });
  }
  
  console.log(`✅ ${data.length} bureaux de vote importés`);
}

async function importCels() {
  console.log('🗳️ Import des cellules électorales...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/6-tbl_cel.csv'), 'utf-8');
  const data = parseCSV(content) as CelData[];
  
  // Récupérer les utilisateurs existants
  const existingUsers = await prisma.user.findMany({
    select: { id: true }
  });
  const userIds = existingUsers.map(u => u.id);
  
  for (const cel of data) {
    // Vérifier si l'utilisateur existe, sinon mettre null
    const numeroUtilisateur = cel.NUM_UTIL && userIds.includes(cel.NUM_UTIL) 
      ? cel.NUM_UTIL 
      : null;
    
    await prisma.tblCel.upsert({
      where: { codeCellule: cel.COD_CEL },
      update: {
        typeCellule: cel.TYP_CEL?.replace(/"/g, '').trim() || null,
        ligneDebutCellule: cel.LIGNE_DEB_CEL ? parseFloat(cel.LIGNE_DEB_CEL) : null,
        etatResultatCellule: cel.ETA_RESULTAT_CEL || null,
        nombreBureauxVote: cel.NBR_BV_CEL ? parseInt(cel.NBR_BV_CEL) : null,
        libelleCellule: cel.LIB_CEL,
        numeroUtilisateur: numeroUtilisateur,
      },
      create: {
        codeCellule: cel.COD_CEL,
        typeCellule: cel.TYP_CEL?.replace(/"/g, '').trim() || null,
        ligneDebutCellule: cel.LIGNE_DEB_CEL ? parseFloat(cel.LIGNE_DEB_CEL) : null,
        etatResultatCellule: cel.ETA_RESULTAT_CEL || null,
        nombreBureauxVote: cel.NBR_BV_CEL ? parseInt(cel.NBR_BV_CEL) : null,
        libelleCellule: cel.LIB_CEL,
        numeroUtilisateur: numeroUtilisateur,
      },
    });
  }
  
  console.log(`✅ ${data.length} cellules électorales importées`);
}

async function main() {
  try {
    console.log('🚀 Début du processus complet : Réinitialisation + Import cartographique');
    console.log('='.repeat(80));
    
    // Étape 1: Générer le client Prisma
    await generatePrismaClient();
    console.log('');
    
    // Étape 2: Réinitialiser la base de données
    await resetDatabase();
    console.log('');
    
    // Étape 3: Importer les données cartographiques
    console.log('📁 Import des données cartographiques dans l\'ordre :');
    console.log('   1. Districts (1-tbl_dst.csv)');
    console.log('   2. Régions (2-tbl_reg.csv)');
    console.log('   3. Départements (3-tbl_dept.csv)');
    console.log('   4. Sous-préfectures (4-tbl_sp.csv)');
    console.log('   5. Communes (5-tbl_com.csv)');
    console.log('   6. Cellules électorales (6-tbl_cel.csv)');
    console.log('   7. Lieux de vote (7-tbl_lv.csv)');
    console.log('   8. Bureaux de vote (8-tbl_bv.csv)');
    console.log('');
    
    await importDistricts();
    await importRegions();
    await importDepartments();
    await importSubPrefectures();
    await importCommunes();
    await importCels();
    await importLieuxVote();
    await importBureauxVote();
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Processus terminé avec succès!');
    console.log('📊 Base de données réinitialisée et données cartographiques importées');
    console.log('🔐 Comptes utilisateurs et rôles préservés');
    
  } catch (error) {
    console.error('❌ Erreur lors du processus:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter seulement si ce script est appelé directement
if (require.main === module) {
  main();
}

export { main as resetAndImportCarto };
