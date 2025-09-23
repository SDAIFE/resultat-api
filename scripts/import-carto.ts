import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RegionData {
  COD_REG: string;
  LIB_REG: string;
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

async function importRegions() {
  console.log('🌍 Import des régions...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/tbl_reg.csv'), 'utf-8');
  const data = parseCSV(content) as RegionData[];
  
  for (const region of data) {
    await prisma.tblReg.upsert({
      where: { codeRegion: region.COD_REG },
      update: {
        libelleRegion: region.LIB_REG,
      },
      create: {
        codeRegion: region.COD_REG,
        libelleRegion: region.LIB_REG,
      },
    });
  }
  
  console.log(`✅ ${data.length} régions importées`);
}

async function importDepartments() {
  console.log('🏛️ Import des départements...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/tbl_dept.csv'), 'utf-8');
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
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/tbl_sp.csv'), 'utf-8');
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
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/tbl_com.csv'), 'utf-8');
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

async function importCels() {
  console.log('🗳️ Import des cellules électorales...');
  const content = fs.readFileSync(path.join(process.cwd(), 'carto/tbl_cel.csv'), 'utf-8');
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
    console.log('🚀 Début de l\'import des données cartographiques...');
    
    await importRegions();
    await importDepartments();
    await importSubPrefectures();
    await importCommunes();
    await importCels();
    
    console.log('✅ Import terminé avec succès!');
    console.log('📊 Données cartographiques complètes importées');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
