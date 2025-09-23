import { ExcelAnalyzerService } from '../src/upload/excel-analyzer.service';
import * as path from 'path';

async function analyzeMarcoryExcel() {
  const analyzerService = new ExcelAnalyzerService();
  const filePath = path.join(process.cwd(), 'COMPIL_CEC MARCORY 02.xlsm');

  console.log('🔍 Analyse du fichier COMPIL_CEC MARCORY 02.xlsm...');
  console.log('📁 Chemin:', filePath);
  console.log('');

  try {
    // Analyser la structure générale
    const analysis = await analyzerService.analyzeExcelStructure(filePath);
    
    console.log('📊 STRUCTURE DU FICHIER:');
    console.log('========================');
    console.log(`📋 Feuilles: ${analysis.sheetNames.join(', ')}`);
    console.log(`📏 Nombre de lignes: ${analysis.totalRows}`);
    console.log(`📝 Colonnes trouvées: ${analysis.columns.length}`);
    console.log('');

    console.log('📋 COLONNES DÉTECTÉES:');
    console.log('=====================');
    analysis.columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col || '[Vide]'}`);
    });
    console.log('');

    console.log('📊 DONNÉES D\'EXEMPLE:');
    console.log('====================');
    analysis.sampleData.forEach((row, index) => {
      console.log(`Ligne ${index + 1}:`, JSON.stringify(row, null, 2));
    });
    console.log('');

    // Analyser spécifiquement pour les CELs avec la nouvelle méthode
    console.log('🔍 ANALYSE SPÉCIFIQUE CEL (Format COMPIL_CEC):');
    console.log('==============================================');
    
    // Extraire le code CEL du nom du fichier
    const codeCellule = 'MARCORY_02'; // Extrait de "COMPIL_CEC MARCORY 02.xlsm"
    
    // Simuler le nombre de BV (dans un vrai cas, on le récupérerait de la base)
    const nombreBvSimule = 15; // Exemple
    
    const celAnalysis = await analyzerService.analyzeCelFile(filePath, codeCellule, nombreBvSimule);
    
    console.log('📋 Headers détectés:');
    celAnalysis.headers.forEach((header, index) => {
      console.log(`   ${index + 1}. ${header}`);
    });
    
    console.log('\n📊 Données d\'exemple (premières lignes):');
    celAnalysis.dataRows.slice(0, 3).forEach((row, index) => {
      console.log(`   Ligne ${index + 13}:`, JSON.stringify(row.slice(0, 5), null, 2)); // Ligne 13+ car on commence à 12
    });
    
    console.log('\n💡 RECOMMANDATIONS CEL:');
    console.log('======================');
    celAnalysis.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    console.log('');

    // Analyser chaque feuille séparément
    console.log('📋 ANALYSE DES FEUILLES:');
    console.log('========================');
    for (const sheetName of analysis.sheetNames) {
      console.log(`\n🔸 Feuille: ${sheetName}`);
      try {
        const sheetData = await analyzerService.extractDataFromRange(filePath, 1, 10, sheetName);
        console.log(`   Lignes d'exemple (1-10): ${sheetData.length} lignes`);
        if (sheetData.length > 0) {
          console.log('   Première ligne:', JSON.stringify(sheetData[0], null, 2));
        }
      } catch (error) {
        console.log(`   Erreur: ${error.message}`);
      }
    }

    console.log('\n✅ Analyse terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    process.exit(1);
  }
}

// Exécuter l'analyse
analyzeMarcoryExcel();
