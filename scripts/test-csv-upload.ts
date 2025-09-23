import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CsvAnalyzerService } from '../src/upload/csv-analyzer.service';
import * as path from 'path';

async function testCsvUpload() {
  console.log('🧪 Test du système d\'upload CSV...\n');

  try {
    // Créer l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const csvAnalyzer = app.get(CsvAnalyzerService);

    // Chemin vers le fichier CSV de test
    const csvFilePath = path.join(__dirname, '..', 'COMPIL_CEC MARCORY 02.csv');
    
    console.log(`📁 Fichier CSV: ${csvFilePath}`);
    console.log('=' .repeat(60));

    // Test 1: Analyser la structure du CSV
    console.log('\n🔍 Test 1: Analyse de la structure CSV');
    const analysis = await csvAnalyzer.analyzeCsvStructure(csvFilePath);
    
    console.log(`✅ Headers trouvés: ${analysis.headers.length}`);
    console.log(`✅ Lignes de données: ${analysis.dataRows.length}`);
    console.log(`✅ Recommandations: ${analysis.recommendations.length}`);
    
    // Afficher les headers
    console.log('\n📋 Headers détectés:');
    analysis.headers.forEach((header, index) => {
      console.log(`  ${index}: "${header}"`);
    });

    // Afficher les recommandations
    console.log('\n💡 Recommandations:');
    analysis.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });

    // Test 2: Mapping des colonnes
    console.log('\n🔍 Test 2: Mapping des colonnes');
    const mapping = csvAnalyzer.mapCsvColumnsToDbFields(analysis.headers);
    
    console.log(`✅ Colonnes mappées: ${Object.keys(mapping).length}`);
    console.log('\n📊 Mapping des colonnes:');
    Object.entries(mapping).forEach(([colName, mappingInfo]) => {
      console.log(`  "${colName}" (index ${mappingInfo.index}) → ${mappingInfo.field} (${mappingInfo.type})`);
    });

    // Test 3: Extraction des lieux de vote
    console.log('\n🔍 Test 3: Extraction des lieux de vote');
    const lieuVoteMap = csvAnalyzer.extractLieuVoteFromData(analysis.dataRows);
    
    console.log(`✅ Lieux de vote extraits: ${Object.keys(lieuVoteMap).length}`);
    console.log('\n🏢 Lieux de vote:');
    Object.entries(lieuVoteMap).forEach(([ref, libelle]) => {
      console.log(`  ${ref}: "${libelle}"`);
    });

    // Test 4: Validation du nom de fichier
    console.log('\n🔍 Test 4: Validation du nom de fichier');
    const fileName = 'COMPIL_CEC MARCORY 02.csv';
    const celCode = 'MARCORY 02';
    const isValidFileName = csvAnalyzer.validateFileName(fileName, celCode);
    
    console.log(`✅ Nom de fichier "${fileName}" valide pour CEL "${celCode}": ${isValidFileName}`);

    // Test 5: Analyse des premières lignes de données
    console.log('\n🔍 Test 5: Analyse des premières lignes de données');
    const sampleRows = analysis.dataRows.slice(0, 3);
    
    console.log(`✅ Analyse de ${sampleRows.length} lignes d'exemple:`);
    sampleRows.forEach((row, index) => {
      console.log(`\n  Ligne ${index + 1}:`);
      row.forEach((cell, cellIndex) => {
        if (cell && cell.trim()) {
          console.log(`    [${cellIndex}]: "${cell}"`);
        }
      });
    });

    // Test 6: Vérification des champs obligatoires
    console.log('\n🔍 Test 6: Vérification des champs obligatoires');
    const requiredFields = ['ordre', 'numeroBureauVote', 'populationTotale'];
    const mappedFields = Object.values(mapping).map(m => m.field);
    
    console.log('📋 Champs obligatoires:');
    requiredFields.forEach(field => {
      const isPresent = mappedFields.includes(field);
      console.log(`  ${field}: ${isPresent ? '✅' : '❌'}`);
    });

    // Test 7: Statistiques des données
    console.log('\n🔍 Test 7: Statistiques des données');
    const totalRows = analysis.dataRows.length;
    const rowsWithData = analysis.dataRows.filter(row => 
      row.some(cell => cell && cell.trim() && cell !== '0')
    ).length;
    
    console.log(`✅ Total des lignes: ${totalRows}`);
    console.log(`✅ Lignes avec données: ${rowsWithData}`);
    console.log(`✅ Taux de données: ${Math.round((rowsWithData / totalRows) * 100)}%`);

    console.log('\n🎉 Test terminé avec succès !');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Exécuter le test
testCsvUpload().catch(console.error);
