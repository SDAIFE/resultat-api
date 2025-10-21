/**
 * Script : Vérifier les codes des communes d'Abidjan
 * 
 * Ce script affiche comment les codes des communes sont construits
 * dans l'endpoint GET /publications/departments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifierCodesCommunes() {
  console.log('🔍 VÉRIFICATION DES CODES DES COMMUNES D\'ABIDJAN');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Récupérer toutes les communes d'Abidjan
    const communes = await prisma.tblCom.findMany({
      where: {
        codeDepartement: '022'
      },
      orderBy: [
        { codeSousPrefecture: 'asc' },
        { codeCommune: 'asc' }
      ]
    });

    console.log(`📊 Nombre de communes trouvées : ${communes.length}`);
    console.log('');
    console.log('📋 LISTE DES COMMUNES D\'ABIDJAN :');
    console.log('-'.repeat(80));
    console.log('');

    console.log('| Code Complet | Libellé | ID |');
    console.log('|--------------|---------|-----|');
    
    communes.forEach(commune => {
      const codeComplet = `${commune.codeDepartement}-${commune.codeSousPrefecture}-${commune.codeCommune}`;
      console.log(`| ${codeComplet} | ${commune.libelleCommune.padEnd(20)} | ${commune.id} |`);
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('💡 OBSERVATIONS :');
    console.log('='.repeat(80));
    console.log('');
    
    // Grouper par codeCommune pour voir les doublons
    const groupedByCommune = new Map<string, any[]>();
    communes.forEach(c => {
      const key = c.codeCommune;
      if (!groupedByCommune.has(key)) {
        groupedByCommune.set(key, []);
      }
      groupedByCommune.get(key)!.push(c);
    });

    console.log('📊 Communes par code :');
    Array.from(groupedByCommune.entries()).forEach(([code, coms]) => {
      console.log(`   Code "${code}" → ${coms.length} commune(s) :`);
      coms.forEach(c => {
        console.log(`      - ${c.codeDepartement}-${c.codeSousPrefecture}-${c.codeCommune} : ${c.libelleCommune}`);
      });
    });

    console.log('');
    console.log('🎯 CONCLUSION :');
    console.log('   Le code commune seul ("001") n\'est PAS unique !');
    console.log('   Il faut utiliser le code complet avec sous-préfecture :');
    console.log('   Format attendu : "022-[SP]-[COM]"');
    console.log('');
    console.log('   Exemple pour ABOBO :');
    const abobo = communes.find(c => c.libelleCommune === 'ABOBO');
    if (abobo) {
      console.log(`   ✅ Code complet : ${abobo.codeDepartement}-${abobo.codeSousPrefecture}-${abobo.codeCommune}`);
      console.log(`   ✅ URL endpoint : GET /api/publications/communes/${abobo.codeDepartement}-${abobo.codeSousPrefecture}-${abobo.codeCommune}/data`);
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
verifierCodesCommunes()
  .then(() => {
    console.log('');
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

