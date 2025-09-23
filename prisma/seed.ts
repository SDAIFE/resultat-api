import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // 1. Créer les rôles utilisateur
  console.log('📝 Création des rôles...');
  const sadminRole = await prisma.role.upsert({
    where: { code: 'SADMIN' },
    update: {},
    create: {
      id: 'SADMIN',
      code: 'SADMIN',
      name: 'Super Administrateur',
      description: 'Accès complet au système - Gestion des utilisateurs et configuration'
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      id: 'ADMIN',
      code: 'ADMIN',
      name: 'Administrateur',
      description: 'Accès complet au système - Gestion des données électorales'
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      id: 'USER',
      code: 'USER',
      name: 'Utilisateur',
      description: 'Agent CEI - Accès limité aux données assignées'
    },
  });

  // 2. Créer les utilisateurs par défaut
  console.log('👤 Création des utilisateurs par défaut...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const sadminUser = await prisma.user.upsert({
    where: { email: 'anderson.aka@cei.ci' },
    update: {},
    create: {
      email: 'anderson.aka@cei.ci',
      firstName: 'Super',
      lastName: 'Administrateur',
      password: hashedPassword,
      roleId: sadminRole.id,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cei.ci' },
    update: {},
    create: {
      email: 'admin.dtic@cei.ci',
      firstName: 'Administrateur',
      lastName: 'Système',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // 3. Créer les régions
  console.log('🌍 Création des régions...');
  const regions = [
    { code: 'LAG', name: 'Lagunes' },
    { code: 'VAL', name: 'Vallée du Bandama' },
    { code: 'HAV', name: 'Haut-Sassandra' },
    { code: 'SAV', name: 'Savanes' },
    { code: 'MON', name: 'Montagnes' },
  ];

  for (const region of regions) {
    await prisma.tblReg.upsert({
      where: { codeRegion: region.code },
      update: {},
      create: {
        codeRegion: region.code,
        libelleRegion: region.name,
      },
    });
  }

  // 4. Créer les départements
  console.log('🏛️ Création des départements...');
  const departements = [
    { code: 'ABJ', name: 'Abidjan', regionCode: 'LAG' },
    { code: 'BOU', name: 'Bouaké', regionCode: 'VAL' },
    { code: 'DAL', name: 'Daloa', regionCode: 'HAV' },
    { code: 'KOR', name: 'Korhogo', regionCode: 'SAV' },
    { code: 'MAN', name: 'Man', regionCode: 'MON' },
  ];

  for (const dept of departements) {
    await prisma.tblDept.upsert({
      where: { codeDepartement: dept.code },
      update: {},
      create: {
        codeDepartement: dept.code,
        codeRegion: dept.regionCode,
        libelleDepartement: dept.name,
        statutPublication: 'N', // Non publié
      },
    });
  }

  // 5. Créer quelques parrains
  console.log('👥 Création des parrains...');
  const parrains = [
    { code: 'RHDP', name: 'Rassemblement des Houphouëtistes pour la Démocratie et la Paix' },
    { code: 'PDCI', name: 'Parti Démocratique de Côte d\'Ivoire' },
    { code: 'FPI', name: 'Front Populaire Ivoirien' },
    { code: 'UDPCI', name: 'Union pour la Démocratie et la Paix en Côte d\'Ivoire' },
  ];

  for (const parrain of parrains) {
    await prisma.tblParrain.upsert({
      where: { codeParrain: parrain.code },
      update: {},
      create: {
        codeParrain: parrain.code,
        libelleParrain: parrain.name,
      },
    });
  }

  // 6. Créer quelques candidats
  console.log('🗳️ Création des candidats...');
  const candidats = [
    { numero: '001', parrain: 'RHDP', nom: 'OUATTARA', prenom: 'Alassane Dramane' },
    { numero: '002', parrain: 'PDCI', nom: 'BEDIE', prenom: 'Henri Konan' },
    { numero: '003', parrain: 'FPI', nom: 'GBAGBO', prenom: 'Laurent' },
    { numero: '004', parrain: 'UDPCI', nom: 'KOUADIO', prenom: 'Konan Bertin' },
  ];

  for (const candidat of candidats) {
    await prisma.tblCandidat.upsert({
      where: { numeroOrdre: candidat.numero },
      update: {},
      create: {
        numeroOrdre: candidat.numero,
        codeParrain: candidat.parrain,
        nomCandidat: candidat.nom,
        prenomCandidat: candidat.prenom,
      },
    });
  }

  console.log('✅ Seeding terminé avec succès!');
  console.log('👤 SAdmin: sadmin@cei.ci / admin123');
  console.log('👤 Admin: admin@cei.ci / admin123');
  console.log('📊 Rôles créés (SADMIN, ADMIN, USER)');
  console.log('🌍 Régions et départements créés');
  console.log('👥 Parrains et candidats créés');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
