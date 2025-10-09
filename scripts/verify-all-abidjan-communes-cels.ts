import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllAbidjanCommunesCels() {
  console.log('='.repeat(80));
  console.log('VÉRIFICATION DÉTAILLÉE : CELs Réelles des 14 Communes d\'Abidjan');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Récupérer toutes les données d'Abidjan
    const abidjanData = await prisma.$queryRaw<Array<{
      COD_DEPT: string;
      LIB_DEPT: string;
      COD_COM: string;
      LIB_COM: string;
      COD_CEL: string;
      LIB_CEL: string;
      ETA_RESULTAT_CEL: string | null;
    }>>`
      SELECT DISTINCT 
        dbo.TBL_LV.COD_DEPT,
        dbo.TBL_DEPT.LIB_DEPT,
        dbo.TBL_LV.COD_COM,
        dbo.TBL_COM.LIB_COM,
        dbo.TBL_CEL.COD_CEL,
        dbo.TBL_CEL.LIB_CEL,
        dbo.TBL_CEL.ETA_RESULTAT_CEL
      FROM dbo.TBL_CEL 
      INNER JOIN dbo.TBL_LV ON dbo.TBL_CEL.COD_CEL = dbo.TBL_LV.COD_CEL 
      INNER JOIN dbo.TBL_COM ON dbo.TBL_LV.COD_DEPT = dbo.TBL_COM.COD_DEPT
        AND dbo.TBL_LV.COD_SP = dbo.TBL_COM.COD_SP
        AND dbo.TBL_LV.COD_COM = dbo.TBL_COM.COD_COM
      INNER JOIN dbo.TBL_DEPT ON dbo.TBL_COM.COD_DEPT = dbo.TBL_DEPT.COD_DEPT
      WHERE dbo.TBL_LV.COD_DEPT = '022'
      ORDER BY dbo.TBL_COM.LIB_COM, dbo.TBL_CEL.COD_CEL
    `;

    console.log(`📊 Total de lignes récupérées : ${abidjanData.length}`);
    console.log();

    // 2. Grouper par commune
    const communesMap = new Map<string, {
      codeCommune: string;
      libelleCommune: string;
      cels: Array<{
        code: string;
        libelle: string;
        statut: string | null;
      }>;
    }>();

    abidjanData.forEach(row => {
      if (!communesMap.has(row.LIB_COM)) {
        communesMap.set(row.LIB_COM, {
          codeCommune: row.COD_COM,
          libelleCommune: row.LIB_COM,
          cels: []
        });
      }

      const commune = communesMap.get(row.LIB_COM)!;
      // Éviter les doublons
      if (!commune.cels.find(c => c.code === row.COD_CEL)) {
        commune.cels.push({
          code: row.COD_CEL,
          libelle: row.LIB_CEL,
          statut: row.ETA_RESULTAT_CEL
        });
      }
    });

    const communes = Array.from(communesMap.values())
      .sort((a, b) => a.libelleCommune.localeCompare(b.libelleCommune));

    console.log('='.repeat(80));
    console.log('📋 DÉTAIL PAR COMMUNE');
    console.log('='.repeat(80));
    console.log();

    let totalCels = 0;

    communes.forEach((commune, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${commune.libelleCommune.toUpperCase()}`);
      console.log('─'.repeat(80));
      console.log(`   Code Commune : ${commune.codeCommune}`);
      console.log(`   Nombre de CELs : ${commune.cels.length}`);
      console.log();
      console.log('   Liste des CELs :');
      
      commune.cels.forEach((cel, celIndex) => {
        const statutEmoji = cel.statut === 'I' ? '✅' : 
                           cel.statut === 'P' ? '📤' : 
                           cel.statut === 'N' ? '⏳' : '❓';
        const statutLabel = cel.statut === 'I' ? 'Importée' : 
                           cel.statut === 'P' ? 'Publiée' : 
                           cel.statut === 'N' ? 'En attente' : 
                           cel.statut || 'Non défini';
        
        console.log(`      ${(celIndex + 1).toString().padStart(2)}. ${statutEmoji} ${cel.code.padEnd(8)} - ${cel.libelle.substring(0, 50).padEnd(50)} | ${statutLabel}`);
      });
      
      totalCels += commune.cels.length;
      console.log();
    });

    // 3. Résumé global
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ GLOBAL');
    console.log('='.repeat(80));
    console.log();
    console.log(`Nombre de communes distinctes : ${communes.length}`);
    console.log(`Total de CELs pour Abidjan : ${totalCels}`);
    console.log();

    // Tableau récapitulatif
    console.log('TABLEAU RÉCAPITULATIF :');
    console.log('-'.repeat(80));
    console.log('N°  | Commune'.padEnd(30) + '| Code | CELs | Statuts');
    console.log('-'.repeat(80));
    
    communes.forEach((commune, index) => {
      const statuts = {
        I: commune.cels.filter(c => c.statut === 'I').length,
        P: commune.cels.filter(c => c.statut === 'P').length,
        N: commune.cels.filter(c => c.statut === 'N').length,
        null: commune.cels.filter(c => !c.statut).length
      };
      
      const statutStr = `I:${statuts.I}, P:${statuts.P}, N:${statuts.N}${statuts.null > 0 ? `, NULL:${statuts.null}` : ''}`;
      
      console.log(
        `${(index + 1).toString().padStart(2)}. | ${commune.libelleCommune.padEnd(25)} | ${commune.codeCommune.padEnd(4)} | ${commune.cels.length.toString().padEnd(4)} | ${statutStr}`
      );
    });
    
    console.log('-'.repeat(80));
    console.log(`TOTAL`.padEnd(32) + `| ${communes.length.toString().padEnd(4)} | ${totalCels}`);
    console.log();

    // 4. Analyse des statuts
    const allCels = communes.flatMap(c => c.cels);
    const statutsGlobal = {
      I: allCels.filter(c => c.statut === 'I').length,
      P: allCels.filter(c => c.statut === 'P').length,
      N: allCels.filter(c => c.statut === 'N').length,
      null: allCels.filter(c => !c.statut).length
    };

    console.log('📈 ANALYSE DES STATUTS DES CELs');
    console.log('-'.repeat(80));
    console.log(`CELs importées (I) : ${statutsGlobal.I}`);
    console.log(`CELs publiées (P) : ${statutsGlobal.P}`);
    console.log(`CELs en attente (N) : ${statutsGlobal.N}`);
    console.log(`CELs sans statut (NULL) : ${statutsGlobal.null}`);
    console.log();

    const tauxImport = totalCels > 0 
      ? Math.round(((statutsGlobal.I + statutsGlobal.P) / totalCels) * 100) 
      : 0;
    
    console.log(`Taux d'import : ${tauxImport}%`);
    console.log();

    // 5. Vérifier les communes avec beaucoup de CELs
    console.log('🔍 COMMUNES AVEC LE PLUS DE CELs');
    console.log('-'.repeat(80));
    
    const communesTriees = [...communes].sort((a, b) => b.cels.length - a.cels.length);
    
    console.log('Top 5 :');
    communesTriees.slice(0, 5).forEach((commune, index) => {
      console.log(`  ${index + 1}. ${commune.libelleCommune.padEnd(20)} : ${commune.cels.length} CELs`);
    });
    console.log();

    // 6. Détail ABOBO
    console.log('🔍 ZOOM SUR ABOBO');
    console.log('='.repeat(80));
    
    const abobo = communes.find(c => c.libelleCommune === 'ABOBO');
    if (abobo) {
      console.log(`Nombre de CELs pour ABOBO : ${abobo.cels.length}`);
      console.log();
      console.log('Liste complète des CELs d\'ABOBO :');
      console.log('-'.repeat(80));
      
      abobo.cels.forEach((cel, index) => {
        const statutEmoji = cel.statut === 'I' ? '✅' : 
                           cel.statut === 'P' ? '📤' : 
                           cel.statut === 'N' ? '⏳' : '❓';
        console.log(`${(index + 1).toString().padStart(2)}. ${statutEmoji} ${cel.code.padEnd(8)} - ${cel.libelle}`);
      });
      console.log();
      
      // Vérifier si ABOBO a des doublons de CELs
      console.log('🔍 Vérification des doublons :');
      const celCodes = abobo.cels.map(c => c.code);
      const uniqueCodes = new Set(celCodes);
      
      if (celCodes.length === uniqueCodes.size) {
        console.log(`✅ Aucun doublon : ${celCodes.length} CELs uniques`);
      } else {
        console.log(`⚠️  ATTENTION : Doublons détectés !`);
        console.log(`   Total lignes : ${celCodes.length}`);
        console.log(`   CELs uniques : ${uniqueCodes.size}`);
        
        // Trouver les doublons
        const doublons = celCodes.filter((code, index) => 
          celCodes.indexOf(code) !== index
        );
        console.log(`   Doublons : ${[...new Set(doublons)].join(', ')}`);
      }
      console.log();

      // Vérifier si ABOBO couvre plusieurs codes communes
      console.log('🔍 Vérification dans TblCom :');
      const aboboCom = await prisma.tblCom.findMany({
        where: {
          codeDepartement: '022',
          libelleCommune: 'ABOBO'
        },
        select: {
          codeCommune: true,
          codeSousPrefecture: true,
          libelleCommune: true
        }
      });
      
      console.log(`Nombre de lignes dans TblCom pour ABOBO : ${aboboCom.length}`);
      aboboCom.forEach((com, index) => {
        console.log(`  ${index + 1}. Code commune : ${com.codeCommune}, Code SP : ${com.codeSousPrefecture}`);
      });
      console.log();

      if (aboboCom.length > 1) {
        console.log('⚠️  ABOBO a plusieurs codes dans TblCom');
        console.log('   Cela peut expliquer le nombre élevé de CELs si elles sont comptées plusieurs fois');
      }
      console.log();
    }

    // 7. Vérification finale : Comparer avec notre méthode getCelsForCommune
    console.log('🔬 TEST 7 : Comparer avec la méthode getCelsForCommune()');
    console.log('='.repeat(80));
    console.log();
    
    const communesTest = ['ABOBO', 'COCODY', 'YOPOUGON', 'BINGERVILLE', 'SONGON'];
    
    for (const nomCommune of communesTest) {
      const commune = communes.find(c => c.libelleCommune === nomCommune);
      if (commune) {
        // Utiliser notre méthode pour récupérer les CELs
        const celsViaMethod = await prisma.$queryRaw<Array<{
          COD_CEL: string;
        }>>`
          SELECT DISTINCT 
            dbo.TBL_CEL.COD_CEL
          FROM dbo.TBL_CEL 
          INNER JOIN dbo.TBL_LV ON dbo.TBL_CEL.COD_CEL = dbo.TBL_LV.COD_CEL 
          INNER JOIN dbo.TBL_COM ON dbo.TBL_LV.COD_DEPT = dbo.TBL_COM.COD_DEPT
            AND dbo.TBL_LV.COD_SP = dbo.TBL_COM.COD_SP
            AND dbo.TBL_LV.COD_COM = dbo.TBL_COM.COD_COM
          WHERE dbo.TBL_COM.COD_DEPT = '022'
            AND dbo.TBL_COM.COD_COM = ${commune.codeCommune}
        `;
        
        console.log(`${nomCommune.padEnd(15)} : ${commune.cels.length} CELs (vue complète) vs ${celsViaMethod.length} CELs (méthode)`);
        
        if (commune.cels.length !== celsViaMethod.length) {
          console.log(`  ⚠️  DIFFÉRENCE détectée !`);
          const celsCodes = commune.cels.map(c => c.code).sort();
          const methodCodes = celsViaMethod.map(c => c.COD_CEL).sort();
          
          console.log(`  CELs vue : ${celsCodes.join(', ')}`);
          console.log(`  CELs méthode : ${methodCodes.join(', ')}`);
        }
      }
    }
    console.log();

    // 8. Recommandation finale
    console.log('='.repeat(80));
    console.log('💡 RECOMMANDATION');
    console.log('='.repeat(80));
    console.log();
    
    if (communes.length === 14) {
      console.log('✅ Les 14 communes d\'Abidjan sont correctement identifiées');
    }
    
    console.log();
    console.log('Si certaines communes ont un nombre de CELs qui vous semble incorrect :');
    console.log();
    console.log('1. Vérifier les doublons dans TblCom (communes avec plusieurs codes)');
    console.log('2. Vérifier les liens dans TblLv (codeCellule NULL ou incorrects)');
    console.log('3. Vérifier que toutes les CELs attendues existent dans TblCel');
    console.log();
    console.log('Notre méthode getCelsForCommune() utilise :');
    console.log('  - COD_COM pour filtrer (pas LIB_COM)');
    console.log('  - Déduplication automatique avec DISTINCT');
    console.log('  - Jointure via TBL_LV → TBL_COM → TBL_CEL');
    console.log();

  } catch (error) {
    console.error('❌ ERREUR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllAbidjanCommunesCels()
  .then(() => {
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

