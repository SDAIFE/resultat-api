import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ParrainData {
  COD_PAR: string;
  LIB_PAR: string;
  SIG_PAR: string;
}

interface CandidatData {
  NUMERO_ORDRE: string;
  COD_PAR: string;
  NOM_CAND: string;
  PREN_CAND: string;
  CHEMIN_PHOTO: string;
  CHEMIN_SYMBOLE: string;
}

async function parseCSV<T>(filePath: string, delimiter: string = ';'): Promise<T[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(delimiter);
  
  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    return obj as T;
  });
}

async function importParrains() {
  console.log('🚀 Début de l\'importation des parrains...');
  
  try {
    const parrainsData = await parseCSV<ParrainData>(path.join(__dirname, '../candidats/tblParrain.csv'));
    
    console.log(`📊 ${parrainsData.length} parrains à importer`);
    
    for (const parrainData of parrainsData) {
      try {
        // Vérifier si le parrain existe déjà
        const existingParrain = await prisma.tblParrain.findUnique({
          where: { codeParrain: parrainData.COD_PAR }
        });
        
        if (existingParrain) {
          console.log(`⚠️  Parrain ${parrainData.COD_PAR} existe déjà, mise à jour...`);
          await prisma.tblParrain.update({
            where: { codeParrain: parrainData.COD_PAR },
            data: {
              libelleParrain: parrainData.LIB_PAR,
              sigle: parrainData.SIG_PAR || null
            }
          });
        } else {
          console.log(`✅ Création du parrain ${parrainData.COD_PAR} - ${parrainData.LIB_PAR}`);
          await prisma.tblParrain.create({
            data: {
              codeParrain: parrainData.COD_PAR,
              libelleParrain: parrainData.LIB_PAR,
              sigle: parrainData.SIG_PAR || null
            }
          });
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'importation du parrain ${parrainData.COD_PAR}:`, error);
      }
    }
    
    console.log('✅ Importation des parrains terminée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des parrains:', error);
    throw error;
  }
}

async function importCandidats() {
  console.log('🚀 Début de l\'importation des candidats...');
  
  try {
    const candidatsData = await parseCSV<CandidatData>(path.join(__dirname, '../candidats/tblCandidat.csv'));
    
    console.log(`📊 ${candidatsData.length} candidats à importer`);
    
    for (const candidatData of candidatsData) {
      try {
        // Vérifier si le candidat existe déjà
        const existingCandidat = await prisma.tblCandidat.findUnique({
          where: { numeroOrdre: candidatData.NUMERO_ORDRE }
        });
        
        if (existingCandidat) {
          console.log(`⚠️  Candidat ${candidatData.NUMERO_ORDRE} existe déjà, mise à jour...`);
          await prisma.tblCandidat.update({
            where: { numeroOrdre: candidatData.NUMERO_ORDRE },
            data: {
              codeParrain: candidatData.COD_PAR || null,
              nomCandidat: candidatData.NOM_CAND,
              prenomCandidat: candidatData.PREN_CAND,
              cheminPhoto: candidatData.CHEMIN_PHOTO || null,
              cheminSymbole: candidatData.CHEMIN_SYMBOLE || null
            }
          });
        } else {
          console.log(`✅ Création du candidat ${candidatData.NUMERO_ORDRE} - ${candidatData.NOM_CAND} ${candidatData.PREN_CAND}`);
          await prisma.tblCandidat.create({
            data: {
              numeroOrdre: candidatData.NUMERO_ORDRE,
              codeParrain: candidatData.COD_PAR || null,
              nomCandidat: candidatData.NOM_CAND,
              prenomCandidat: candidatData.PREN_CAND,
              cheminPhoto: candidatData.CHEMIN_PHOTO || null,
              cheminSymbole: candidatData.CHEMIN_SYMBOLE || null
            }
          });
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'importation du candidat ${candidatData.NUMERO_ORDRE}:`, error);
      }
    }
    
    console.log('✅ Importation des candidats terminée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des candidats:', error);
    throw error;
  }
}

async function main() {
  console.log('🎯 Script d\'importation des données candidats/parrains');
  console.log('================================================');
  
  try {
    // Import des parrains en premier (référence pour les candidats)
    await importParrains();
    
    // Pause pour laisser le temps aux parrains d'être créés
    console.log('⏳ Pause de 1 seconde...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Import des candidats
    await importCandidats();
    
    console.log('🎉 Importation terminée avec succès !');
    
    // Affichage des statistiques finales
    const totalParrains = await prisma.tblParrain.count();
    const totalCandidats = await prisma.tblCandidat.count();
    
    console.log('📊 Statistiques finales:');
    console.log(`   - Parrains: ${totalParrains}`);
    console.log(`   - Candidats: ${totalCandidats}`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution du script
if (require.main === module) {
  main();
}

export { importParrains, importCandidats };
