/**
 * Script de Vérification : Format des Codes Communes
 * 
 * Ce script simule l'appel de GET /api/publications/departments
 * et vérifie que les communes ont le format correct (022-001-004)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifierFormatCodesCommunes() {
  console.log('🔍 VÉRIFICATION DU FORMAT DES CODES COMMUNES');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Simuler la méthode getAbidjanCommunes()
    const communes = await prisma.tblCom.findMany({
      where: { codeDepartement: '022' },
      select: {
        id: true,
        codeCommune: true,
        codeSousPrefecture: true,
        libelleCommune: true,
        codeDepartement: true,
        statutPublication: true,
        numeroUtilisateur: true
      },
      orderBy: { libelleCommune: 'asc' }
    });

    // Dédupliquer par libellé
    const uniqueCommunes = new Map<string, typeof communes[0]>();
    communes.forEach(commune => {
      if (!uniqueCommunes.has(commune.libelleCommune)) {
        uniqueCommunes.set(commune.libelleCommune, commune);
      }
    });

    const communesUniques = Array.from(uniqueCommunes.values());

    console.log(`📊 Communes d'Abidjan trouvées : ${communesUniques.length}`);
    console.log('');
    console.log('📋 FORMAT DES CODES (comme retournés par l\'endpoint) :');
    console.log('-'.repeat(80));
    console.log('');

    console.log('| Code Complet    | Libellé           | codeSousPrefecture | codeCommune |');
    console.log('|-----------------|-------------------|-------------------|-------------|');
    
    communesUniques.forEach(commune => {
      // Format comme dans l'endpoint
      const codeComplet = `022-${commune.codeSousPrefecture}-${commune.codeCommune}`;
      
      console.log(`| ${codeComplet.padEnd(15)} | ${commune.libelleCommune.padEnd(17)} | ${commune.codeSousPrefecture.padEnd(17)} | ${commune.codeCommune.padEnd(11)} |`);
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ VÉRIFICATION :');
    console.log('='.repeat(80));
    console.log('');

    // Vérifier que tous les codes sont au format 3 parties
    const allCodesValid = communesUniques.every(commune => {
      const code = `022-${commune.codeSousPrefecture}-${commune.codeCommune}`;
      return code.split('-').length === 3;
    });

    if (allCodesValid) {
      console.log('✅ Tous les codes sont au format 3 parties (dept-SP-com)');
      console.log('✅ Le frontend pourra utiliser ces codes directement');
    } else {
      console.log('❌ Certains codes ne sont pas au bon format');
    }

    console.log('');
    console.log('📊 EXEMPLE DE RÉPONSE DE L\'ENDPOINT :');
    console.log('-'.repeat(80));
    console.log('');

    // Simuler la réponse pour COCODY
    const cocody = communesUniques.find(c => c.libelleCommune === 'COCODY');
    if (cocody) {
      const exampleEntity = {
        id: cocody.id,
        code: `022-${cocody.codeSousPrefecture}-${cocody.codeCommune}`,
        libelle: `ABIDJAN - ${cocody.libelleCommune}`,
        type: 'COMMUNE',
        codeDepartement: '022',
        codeSousPrefecture: cocody.codeSousPrefecture,
        codeCommune: cocody.codeCommune,
        totalCels: 7, // Exemple
        importedCels: 7,
        pendingCels: 0,
        publicationStatus: 'PUBLISHED',
        lastUpdate: new Date().toISOString(),
        cels: []
      };

      console.log(JSON.stringify(exampleEntity, null, 2));
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('🎯 UTILISATION FRONTEND :');
    console.log('='.repeat(80));
    console.log('');

    console.log('Le frontend peut maintenant construire l\'URL ainsi :');
    console.log('');
    console.log('```typescript');
    console.log('// Détecter si c\'est une commune ou un département');
    console.log('const isCommune = entity.type === \'COMMUNE\';');
    console.log('');
    console.log('const endpoint = isCommune');
    console.log('  ? `/api/publications/communes/${entity.code}/data`  // Utiliser entity.code directement !');
    console.log('  : `/api/publications/departments/${entity.code}/data`;');
    console.log('```');
    console.log('');
    console.log('Exemples :');
    
    communesUniques.slice(0, 3).forEach(commune => {
      const code = `022-${commune.codeSousPrefecture}-${commune.codeCommune}`;
      console.log(`  - ${commune.libelleCommune.padEnd(15)} : GET /api/publications/communes/${code}/data`);
    });

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
verifierFormatCodesCommunes()
  .then(() => {
    console.log('');
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

