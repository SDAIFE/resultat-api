import * as fs from 'fs';
import * as path from 'path';

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

async function checkDataConsistency() {
  console.log('🔍 Vérification de la cohérence des données...');
  
  // Lire les lieux de vote
  const lvContent = fs.readFileSync(path.join(process.cwd(), 'carto/7-tbl_lv.csv'), 'utf-8');
  const lvData = parseCSV(lvContent);
  
  // Lire les bureaux de vote
  const bvContent = fs.readFileSync(path.join(process.cwd(), 'carto/8-tbl_bv.csv'), 'utf-8');
  const bvData = parseCSV(bvContent);
  
  console.log(`📊 Lieux de vote: ${lvData.length} entrées`);
  console.log(`📊 Bureaux de vote: ${bvData.length} entrées`);
  
  // Créer les clés pour les lieux de vote
  const lvKeys = new Set();
  lvData.forEach(lv => {
    const key = `${lv.COD_DEPT}-${lv.COD_SP}-${lv.COD_COM}-${lv.COD_LV}`;
    lvKeys.add(key);
  });
  
  // Créer les clés pour les bureaux de vote
  const bvKeys = new Set();
  bvData.forEach(bv => {
    const key = `${bv.COD_DEPT}-${bv.COD_SP}-${bv.COD_COM}-${bv.COD_LV}`;
    bvKeys.add(key);
  });
  
  console.log(`🔑 Lieux de vote uniques: ${lvKeys.size}`);
  console.log(`🔑 Bureaux de vote uniques: ${bvKeys.size}`);
  
  // Trouver les clés communes
  const commonKeys = [...lvKeys].filter(key => bvKeys.has(key));
  console.log(`✅ Clés communes: ${commonKeys.length}`);
  
  if (commonKeys.length === 0) {
    console.log('\n❌ Aucune correspondance trouvée entre lieux de vote et bureaux de vote!');
    console.log('\n📋 Premiers lieux de vote:');
    [...lvKeys].slice(0, 10).forEach(key => console.log(`   ${key}`));
    console.log('\n📋 Premiers bureaux de vote:');
    [...bvKeys].slice(0, 10).forEach(key => console.log(`   ${key}`));
    
    // Vérifier les départements
    const lvDepts = new Set(lvData.map(lv => lv.COD_DEPT));
    const bvDepts = new Set(bvData.map(bv => bv.COD_DEPT));
    console.log('\n🏛️ Départements dans lieux de vote:', [...lvDepts].sort());
    console.log('🏛️ Départements dans bureaux de vote:', [...bvDepts].sort());
  } else {
    console.log('\n✅ Correspondances trouvées!');
    console.log('📋 Premières correspondances:');
    commonKeys.slice(0, 10).forEach(key => console.log(`   ${key}`));
  }
}

checkDataConsistency().catch(console.error);
