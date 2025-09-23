import { ExcelAnalyzerService } from '../src/upload/excel-analyzer.service';
import * as path from 'path';

async function analyzeEprFile() {
  const analyzer = new ExcelAnalyzerService();
  const filePath = path.join(process.cwd(), 'EPR_2025_COMPILATION_CEL.xlsm');
  
  console.log('🔍 Analyse du fichier EPR_2025_COMPILATION_CEL.xlsm...');
  console.log('📁 Chemin:', filePath);
  
  try {
    const result = await analyzer.analyzeEprFile(filePath);
    
    console.log('\n📊 STRUCTURE DU FICHIER:');
    console.log('========================');
    console.log('📋 Feuilles:', result.structure.sheetNames.join(', '));
    console.log('📏 Nombre de lignes:', result.structure.totalRows);
    console.log('📝 Colonnes trouvées:', result.structure.columns.length);
    
    console.log('\n📋 COLONNES DÉTECTÉES:');
    console.log('=====================');
    result.structure.columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });
    
    console.log('\n📊 DONNÉES D\'EXEMPLE:');
    console.log('====================');
    result.structure.sampleData.forEach((row, index) => {
      console.log(`Ligne ${index + 1}:`, row.slice(0, 5)); // Afficher les 5 premières colonnes
    });
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('==================');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\n✅ Analyse terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
  }
}

// Exécuter l'analyse
analyzeEprFile();
