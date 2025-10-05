import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 Vérification des données importées');
  console.log('====================================');
  
  try {
    // Vérifier les parrains
    const parrains = await prisma.tblParrain.findMany({
      include: {
        candidats: true
      },
      orderBy: {
        codeParrain: 'asc'
      }
    });
    
    console.log(`\n📋 Parrains importés (${parrains.length}):`);
    console.log('─'.repeat(80));
    parrains.forEach(parrain => {
      console.log(`Code: ${parrain.codeParrain}`);
      console.log(`Libellé: ${parrain.libelleParrain}`);
      console.log(`Sigle: ${parrain.sigle || 'N/A'}`);
      console.log(`Candidats: ${parrain.candidats.length}`);
      console.log('─'.repeat(40));
    });
    
    // Vérifier les candidats
    const candidats = await prisma.tblCandidat.findMany({
      include: {
        parrain: true
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });
    
    console.log(`\n👥 Candidats importés (${candidats.length}):`);
    console.log('─'.repeat(80));
    candidats.forEach(candidat => {
      console.log(`N°: ${candidat.numeroOrdre}`);
      console.log(`Nom: ${candidat.nomCandidat} ${candidat.prenomCandidat}`);
      console.log(`Parrain: ${candidat.parrain?.libelleParrain || 'N/A'} (${candidat.codeParrain || 'N/A'})`);
      console.log(`Photo: ${candidat.cheminPhoto || 'N/A'}`);
      console.log(`Symbole: ${candidat.cheminSymbole || 'N/A'}`);
      console.log('─'.repeat(40));
    });
    
    // Statistiques
    console.log('\n📊 Statistiques finales:');
    console.log(`   - Total parrains: ${parrains.length}`);
    console.log(`   - Total candidats: ${candidats.length}`);
    
    const parrainsAvecSigle = parrains.filter(p => p.sigle).length;
    console.log(`   - Parrains avec sigle: ${parrainsAvecSigle}`);
    
    const candidatsAvecParrain = candidats.filter(c => c.codeParrain).length;
    console.log(`   - Candidats avec parrain: ${candidatsAvecParrain}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyImport();
}

export { verifyImport };
