import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTblComColumns() {
  console.log('='.repeat(80));
  console.log('VÉRIFICATION : Colonnes de TBL_COM');
  console.log('='.repeat(80));
  console.log();

  try {
    // Vérifier la structure de TBL_COM
    const result = await prisma.$queryRaw<Array<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      IS_NULLABLE: string;
    }>>`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TBL_COM'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('📋 COLONNES DE TBL_COM:');
    console.log('-'.repeat(80));
    
    result.forEach((col, index) => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${(index + 1).toString().padStart(2)}. ${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(15)} ${nullable}`);
    });
    
    console.log();
    console.log('-'.repeat(80));
    
    // Vérifier si STAT_PUB et NUM_UTIL existent
    const hasStatPub = result.some(col => col.COLUMN_NAME === 'STAT_PUB');
    const hasNumUtil = result.some(col => col.COLUMN_NAME === 'NUM_UTIL');
    
    console.log();
    console.log('✅ Vérification des colonnes ajoutées:');
    console.log(`  STAT_PUB: ${hasStatPub ? '✅ Présente' : '❌ Absente'}`);
    console.log(`  NUM_UTIL: ${hasNumUtil ? '✅ Présente' : '❌ Absente'}`);
    console.log();

    if (!hasStatPub || !hasNumUtil) {
      console.log('⚠️  COLONNES MANQUANTES !');
      console.log();
      console.log('Pour les ajouter, exécutez:');
      console.log('  npx prisma db push --accept-data-loss');
      console.log();
      console.log('Ou exécutez le script SQL:');
      console.log('  scripts/add-commune-columns.sql');
      console.log();
    } else {
      console.log('✅ Toutes les colonnes nécessaires sont présentes !');
      console.log();
      
      // Tester une requête avec les nouvelles colonnes
      const sampleCommunes = await prisma.tblCom.findMany({
        where: { codeDepartement: '022' },
        select: {
          libelleCommune: true,
          statutPublication: true,
          numeroUtilisateur: true
        },
        take: 3
      });
      
      console.log('📄 Exemple de données (3 premières communes d\'Abidjan):');
      console.log('-'.repeat(80));
      sampleCommunes.forEach((com, index) => {
        console.log(`${index + 1}. ${com.libelleCommune}`);
        console.log(`   Statut publication: ${com.statutPublication || 'NULL'}`);
        console.log(`   Utilisateur: ${com.numeroUtilisateur || 'NULL'}`);
      });
      console.log();
    }

  } catch (error) {
    console.error('❌ ERREUR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTblComColumns()
  .then(() => {
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

