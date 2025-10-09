import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ViewListeCelParDepartement {
  COD_DEPT: string;
  LIB_DEPT: string;
  COD_COM: string;
  LIB_COM: string;
  COD_CEL: string;
  LIB_CEL: string;
}

async function showAbidjanCommunes() {
  console.log('='.repeat(80));
  console.log('DÉTAIL DES COMMUNES D\'ABIDJAN (Code Département: 022)');
  console.log('='.repeat(80));
  console.log();

  try {
    // Récupérer toutes les lignes pour Abidjan
    const abidjanData = await prisma.$queryRaw<ViewListeCelParDepartement[]>`
      SELECT COD_DEPT, LIB_DEPT, COD_COM, LIB_COM, COD_CEL, LIB_CEL
      FROM View_Liste_Cel_Par_Departement
      WHERE COD_DEPT = '022'
      ORDER BY COD_COM, COD_CEL
    `;

    console.log(`Total de lignes pour Abidjan: ${abidjanData.length}`);
    console.log();

    // Grouper par commune
    const communesMap = new Map<string, {
      codeCommune: string;
      libelleCommune: string;
      cellules: Array<{ code: string; libelle: string }>;
    }>();

    abidjanData.forEach(row => {
      if (!communesMap.has(row.COD_COM)) {
        communesMap.set(row.COD_COM, {
          codeCommune: row.COD_COM,
          libelleCommune: row.LIB_COM,
          cellules: []
        });
      }

      const commune = communesMap.get(row.COD_COM)!;
      // Éviter les doublons de CELs
      if (!commune.cellules.find(c => c.code === row.COD_CEL)) {
        commune.cellules.push({
          code: row.COD_CEL,
          libelle: row.LIB_CEL
        });
      }
    });

    // Afficher les communes
    console.log('📋 LISTE DES COMMUNES D\'ABIDJAN');
    console.log('='.repeat(80));

    const communesArray = Array.from(communesMap.values())
      .sort((a, b) => a.libelleCommune.localeCompare(b.libelleCommune));

    communesArray.forEach((commune, index) => {
      const displayName = `ABIDJAN - ${commune.libelleCommune}`;
      console.log();
      console.log(`${(index + 1).toString().padStart(2)}. ${displayName}`);
      console.log(`    Code Commune: ${commune.codeCommune}`);
      console.log(`    Nombre de CELs: ${commune.cellules.length}`);
      console.log(`    CELs: ${commune.cellules.map(c => c.code).join(', ')}`);
    });

    console.log();
    console.log('='.repeat(80));
    console.log(`TOTAL: ${communesArray.length} communes d'Abidjan`);
    console.log(`TOTAL: ${abidjanData.length} lignes (liaisons commune-CEL)`);
    console.log();

    // Vérifier si les communes ont des statuts de publication
    console.log('🔍 VÉRIFICATION DES STATUTS DE PUBLICATION');
    console.log('-'.repeat(80));
    
    const communesCodes = communesArray.map(c => c.codeCommune);
    
    // Vérifier dans TblCom
    const communesFromTblCom = await prisma.tblCom.findMany({
      where: {
        codeDepartement: '022',
        codeCommune: { in: communesCodes }
      },
      select: {
        codeCommune: true,
        libelleCommune: true,
        codeDepartement: true,
        codeSousPrefecture: true
      }
    });

    console.log(`Communes trouvées dans TblCom: ${communesFromTblCom.length}`);
    
    if (communesFromTblCom.length > 0) {
      console.log();
      console.log('Aperçu de TblCom pour Abidjan:');
      communesFromTblCom.slice(0, 5).forEach(com => {
        console.log(`  - ${com.libelleCommune} (${com.codeCommune}) - Dept: ${com.codeDepartement}, SP: ${com.codeSousPrefecture}`);
      });
      
      // Vérifier si le modèle TblCom a un champ statutPublication
      console.log();
      console.log('⚠️  NOTE: TblCom n\'a actuellement PAS de champ "statutPublication"');
      console.log('   Il faudra l\'ajouter au schema Prisma pour gérer la publication par commune');
    }

    console.log();

  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

showAbidjanCommunes()
  .then(() => {
    console.log('✅ Analyse terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

