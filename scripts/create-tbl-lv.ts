import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

const prisma = new PrismaClient();

interface TblLvData {
  COD_DEPT: string;
  COD_SP: string;
  COD_COM: string;
  COD_LV: string;
  COD_CEL: string;
  LIB_LV: string;
}

async function createTblLv() {
  try {
    console.log('🚀 Début de la création de la table TBL_LV...');
    
    // Chemin vers le fichier CSV
    const csvFilePath = path.join(__dirname, '..', 'carto', '7-tbl_lv.csv');
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Le fichier CSV n'existe pas : ${csvFilePath}`);
    }
    
    console.log(`📁 Lecture du fichier : ${csvFilePath}`);
    
    // Lire et parser le fichier CSV
    const records: TblLvData[] = [];
    
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvFilePath, { encoding: 'utf8' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data: any) => {
          // Nettoyer les données en gérant le BOM
          const cleanData: TblLvData = {
            COD_DEPT: (data['﻿COD_DEPT'] || data.COD_DEPT || '').trim(),
            COD_SP: (data.COD_SP || '').trim(),
            COD_COM: (data.COD_COM || '').trim(),
            COD_LV: (data.COD_LV || '').trim(),
            COD_CEL: (data.COD_CEL || '').trim(),
            LIB_LV: (data.LIB_LV || '').trim()
          };
          
          // Vérifier que toutes les données requises sont présentes
          if (cleanData.COD_DEPT && cleanData.COD_SP && cleanData.COD_COM && 
              cleanData.COD_LV && cleanData.LIB_LV) {
            records.push(cleanData);
          }
        })
        .on('end', () => {
          console.log(`✅ ${records.length} enregistrements lus depuis le CSV`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Erreur lors de la lecture du CSV:', error);
          reject(error);
        });
    });
    
    if (records.length === 0) {
      throw new Error('Aucun enregistrement valide trouvé dans le fichier CSV');
    }
    
    // Vérifier la connexion à la base de données
    console.log('🔌 Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Vérifier si la table existe déjà et compter les enregistrements
    const existingCount = await prisma.tblLv.count();
    console.log(`📊 Nombre d'enregistrements existants dans TBL_LV : ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('⚠️  La table TBL_LV contient déjà des données.');
      console.log('🔄 Suppression des données existantes...');
      await prisma.tblLv.deleteMany({});
      console.log('✅ Données existantes supprimées');
    }
    
    // Insérer les données par lots pour optimiser les performances
    const batchSize = 1000;
    let insertedCount = 0;
    
    console.log(`📥 Insertion des données par lots de ${batchSize}...`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Préparer les données pour l'insertion
      const dataToInsert = batch.map(record => ({
        codeDepartement: record.COD_DEPT,
        codeSousPrefecture: record.COD_SP,
        codeCommune: record.COD_COM,
        codeLieuVote: record.COD_LV,
        codeCellule: record.COD_CEL || null,
        libelleLieuVote: record.LIB_LV
      }));
      
      try {
        await prisma.tblLv.createMany({
          data: dataToInsert
        });
        
        insertedCount += batch.length;
        console.log(`✅ Lot ${Math.floor(i / batchSize) + 1} inséré (${insertedCount}/${records.length})`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de l'insertion du lot ${Math.floor(i / batchSize) + 1}:`, error);
        
        // Essayer d'insérer les enregistrements un par un pour identifier les problèmes
        console.log('🔍 Tentative d\'insertion individuelle pour ce lot...');
        for (const record of batch) {
          try {
            await prisma.tblLv.create({
              data: {
                codeDepartement: record.COD_DEPT,
                codeSousPrefecture: record.COD_SP,
                codeCommune: record.COD_COM,
                codeLieuVote: record.COD_LV,
                codeCellule: record.COD_CEL || null,
                libelleLieuVote: record.LIB_LV
              }
            });
            insertedCount++;
          } catch (individualError) {
            console.error(`❌ Erreur pour l'enregistrement ${record.COD_DEPT}-${record.COD_SP}-${record.COD_COM}-${record.COD_LV}:`, individualError);
          }
        }
      }
    }
    
    // Vérifier le résultat final
    const finalCount = await prisma.tblLv.count();
    console.log(`🎉 Import terminé avec succès !`);
    console.log(`📊 Total d'enregistrements dans TBL_LV : ${finalCount}`);
    console.log(`📈 Enregistrements insérés : ${insertedCount}`);
    console.log(`📉 Enregistrements ignorés : ${records.length - insertedCount}`);
    
    // Afficher quelques exemples d'enregistrements insérés
    console.log('\n📋 Exemples d\'enregistrements insérés :');
    const sampleRecords = await prisma.tblLv.findMany({
      take: 5,
      select: {
        codeDepartement: true,
        codeSousPrefecture: true,
        codeCommune: true,
        codeLieuVote: true,
        codeCellule: true,
        libelleLieuVote: true
      }
    });
    
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.codeDepartement}-${record.codeSousPrefecture}-${record.codeCommune}-${record.codeLieuVote} | ${record.libelleLieuVote}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table TBL_LV:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connexion à la base de données fermée');
  }
}

// Fonction pour vérifier les dépendances (tables parentes)
async function checkDependencies() {
  try {
    console.log('🔍 Vérification des dépendances...');
    
    // Vérifier les départements
    const deptCount = await prisma.tblDept.count();
    console.log(`📊 Nombre de départements : ${deptCount}`);
    
    // Vérifier les sous-préfectures
    const spCount = await prisma.tblSp.count();
    console.log(`📊 Nombre de sous-préfectures : ${spCount}`);
    
    // Vérifier les communes
    const comCount = await prisma.tblCom.count();
    console.log(`📊 Nombre de communes : ${comCount}`);
    
    // Vérifier les cellules
    const celCount = await prisma.tblCel.count();
    console.log(`📊 Nombre de cellules : ${celCount}`);
    
    if (deptCount === 0) {
      console.log('⚠️  Aucun département trouvé. Assurez-vous d\'avoir importé les données des départements.');
    }
    
    if (spCount === 0) {
      console.log('⚠️  Aucune sous-préfecture trouvée. Assurez-vous d\'avoir importé les données des sous-préfectures.');
    }
    
    if (comCount === 0) {
      console.log('⚠️  Aucune commune trouvée. Assurez-vous d\'avoir importé les données des communes.');
    }
    
    console.log('✅ Vérification des dépendances terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des dépendances:', error);
  }
}

// Fonction pour tester uniquement la lecture CSV
async function testCsvOnly() {
  try {
    console.log('🧪 Test de lecture du fichier CSV uniquement...');
    
    const csvFilePath = path.join(__dirname, '..', 'carto', '7-tbl_lv.csv');
    console.log(`📁 Lecture du fichier : ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Le fichier CSV n'existe pas : ${csvFilePath}`);
    }
    
    const records: TblLvData[] = [];
    
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvFilePath, { encoding: 'utf8' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data: any) => {
          // Nettoyer les données en gérant le BOM
          const cleanData: TblLvData = {
            COD_DEPT: (data['﻿COD_DEPT'] || data.COD_DEPT || '').trim(),
            COD_SP: (data.COD_SP || '').trim(),
            COD_COM: (data.COD_COM || '').trim(),
            COD_LV: (data.COD_LV || '').trim(),
            COD_CEL: (data.COD_CEL || '').trim(),
            LIB_LV: (data.LIB_LV || '').trim()
          };
          
          // Vérifier que toutes les données requises sont présentes
          if (cleanData.COD_DEPT && cleanData.COD_SP && cleanData.COD_COM && 
              cleanData.COD_LV && cleanData.LIB_LV) {
            records.push(cleanData);
          }
        })
        .on('end', () => {
          console.log(`✅ ${records.length} enregistrements lus depuis le CSV`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Erreur lors de la lecture du CSV:', error);
          reject(error);
        });
    });
    
    if (records.length === 0) {
      throw new Error('Aucun enregistrement valide trouvé dans le fichier CSV');
    }
    
    console.log(`🎉 Lecture CSV réussie !`);
    console.log(`📊 Total d'enregistrements valides : ${records.length}`);
    
    // Afficher quelques exemples
    console.log('\n📋 Exemples d\'enregistrements lus :');
    records.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. ${record.COD_DEPT}-${record.COD_SP}-${record.COD_COM}-${record.COD_LV} | ${record.LIB_LV}`);
    });
    
    console.log('\n✅ Le script de lecture CSV fonctionne correctement !');
    console.log('💡 Pour utiliser avec la base de données, configurez correctement le fichier .env');
    
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du CSV:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    console.log('🎯 Script de création de la table TBL_LV');
    console.log('==========================================');
    
    // Vérifier si on peut se connecter à la base de données
    try {
      await prisma.$connect();
      console.log('✅ Connexion à la base de données réussie');
      
      // Vérifier les dépendances d'abord
      await checkDependencies();
      
      // Créer la table avec les données
      await createTblLv();
      
      console.log('\n🎉 Script terminé avec succès !');
      
    } catch (dbError) {
      console.log('⚠️  Impossible de se connecter à la base de données');
      console.log('🔍 Erreur:', dbError.message);
      console.log('\n🧪 Test de lecture CSV uniquement...');
      
      await testCsvOnly();
      
      console.log('\n💡 Pour utiliser avec la base de données :');
      console.log('1. Configurez correctement DATABASE_URL dans le fichier .env');
      console.log('2. Assurez-vous que la base de données est accessible');
      console.log('3. Relancez le script');
    }
    
  } catch (error) {
    console.error('\n💥 Le script a échoué:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { createTblLv, checkDependencies };
