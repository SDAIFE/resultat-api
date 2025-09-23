#!/usr/bin/env ts-node

/**
 * Script pour lister les utilisateurs existants
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers(): Promise<void> {
  console.log('👥 Liste des utilisateurs existants\n');

  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        departements: {
          select: {
            codeDepartement: true
          }
        }
      }
    });

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données');
      console.log('\n💡 Créez un utilisateur avec :');
      console.log('npm run create:test-user');
      return;
    }

    console.log(`✅ ${users.length} utilisateur(s) trouvé(s) :\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rôle: ${user.role.code}`);
      console.log(`   Actif: ${user.isActive ? 'Oui' : 'Non'}`);
      console.log(`   Départements: ${user.departements.length}`);
      console.log('');
    });

    console.log('🧪 Pour tester l\'authentification, utilisez l\'un de ces emails');

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  await listUsers();
}

if (require.main === module) {
  main();
}
