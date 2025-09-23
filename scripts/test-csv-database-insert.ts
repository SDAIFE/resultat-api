import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UploadService } from '../src/upload/upload.service';
import { PrismaService } from '../src/database/prisma.service';
import * as path from 'path';

async function testCsvDatabaseInsert() {
  console.log('🧪 Test d\'insertion CSV en base de données...\n');

  try {
    // Créer l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const uploadService = app.get(UploadService);
    const prisma = app.get(PrismaService);

    // Chemin vers le fichier CSV de test
    const csvFilePath = path.join(__dirname, '..', 'COMPIL_CEC MARCORY 02.csv');
    
    console.log(`📁 Fichier CSV: ${csvFilePath}`);
    console.log('=' .repeat(60));

    // Vérifier que la CEL existe
    const cel = await prisma.tblCel.findUnique({
      where: { codeCellule: 'MARCORY 02' }
    });

    if (!cel) {
      console.log('⚠️  CEL MARCORY 02 non trouvée, création...');
      await prisma.tblCel.create({
        data: {
          codeCellule: 'MARCORY 02',
          libelleCellule: 'CEC MARCORY 02',
          typeCellule: 'CEC',
          nombreBureauxVote: 152,
          etatResultatCellule: 'ACTIVE'
        }
      });
      console.log('✅ CEL MARCORY 02 créée');
    } else {
      console.log('✅ CEL MARCORY 02 trouvée');
    }

    // Test d'upload du fichier CSV
    console.log('\n🔍 Test d\'upload du fichier CSV...');
    
    const uploadDto = {
      codeCellule: 'MARCORY 02',
      nomFichier: 'COMPIL_CEC MARCORY 02.csv',
      nombreBv: 152
    };

    const result = await uploadService.processExcelFile(
      csvFilePath,
      uploadDto,
      'test-user-id'
    );

    console.log('\n📊 Résultats de l\'upload:');
    console.log(`  ✅ ID: ${result.id}`);
    console.log(`  ✅ Code CEL: ${result.codeCellule}`);
    console.log(`  ✅ Nom fichier: ${result.nomFichier}`);
    console.log(`  ✅ Statut: ${result.statutImport}`);
    console.log(`  ✅ Lignes importées: ${result.nombreLignesImportees}`);
    console.log(`  ✅ Lignes en erreur: ${result.nombreLignesEnErreur}`);
    
    if (result.messageErreur) {
      console.log(`  ⚠️  Message d'erreur: ${result.messageErreur}`);
    }

    // Vérifier les données insérées
    console.log('\n🔍 Vérification des données insérées...');
    
    const insertedData = await prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: 'MARCORY 02',
        nomFichier: 'COMPIL_CEC MARCORY 02.csv'
      },
      take: 5,
      orderBy: { dateImport: 'desc' }
    });

    console.log(`✅ Données trouvées: ${insertedData.length}`);
    
    if (insertedData.length > 0) {
      console.log('\n📋 Exemples de données insérées:');
      insertedData.forEach((data, index) => {
        console.log(`\n  Enregistrement ${index + 1}:`);
        console.log(`    Ordre: ${data.ordre}`);
        console.log(`    Référence lieu: ${data.referenceLieuVote}`);
        console.log(`    Libellé lieu: ${data.libelleLieuVote}`);
        console.log(`    Bureau vote: ${data.numeroBureauVote}`);
        console.log(`    Population totale: ${data.populationTotale}`);
        console.log(`    Total votants: ${data.totalVotants}`);
        console.log(`    Score 1: ${data.score1}`);
        console.log(`    Score 2: ${data.score2}`);
        console.log(`    Score 3: ${data.score3}`);
        console.log(`    Score 4: ${data.score4}`);
        console.log(`    Score 5: ${data.score5}`);
      });
    }

    // Statistiques finales
    console.log('\n📊 Statistiques finales:');
    const totalImports = await prisma.tblImportExcelCel.count({
      where: { codeCellule: 'MARCORY 02' }
    });
    
    const successfulImports = await prisma.tblImportExcelCel.count({
      where: { 
        codeCellule: 'MARCORY 02',
        statutImport: 'COMPLETED'
      }
    });

    console.log(`  ✅ Total imports CEL: ${totalImports}`);
    console.log(`  ✅ Imports réussis: ${successfulImports}`);
    console.log(`  ✅ Taux de réussite: ${Math.round((successfulImports / totalImports) * 100)}%`);

    console.log('\n🎉 Test d\'insertion terminé avec succès !');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'insertion:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Exécuter le test
testCsvDatabaseInsert().catch(console.error);
