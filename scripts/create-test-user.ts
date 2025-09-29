#!/usr/bin/env ts-node

/**
 * Script pour créer un utilisateur de test
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser(): Promise<void> {
  console.log('👤 Création d\'un utilisateur de test\n');

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: 'anderson.aka@cei.ci' }
    });

    if (existingUser) {
      console.log('⚠️  L\'utilisateur anderson.aka@cei.ci existe déjà');
      console.log('ID:', existingUser.id);
      console.log('Actif:', existingUser.isActive);
      return;
    }

    // Vérifier si le rôle USER existe
    let userRole = await prisma.role.findUnique({
      where: { code: 'USER' }
    });

    if (!userRole) {
      console.log('📝 Création du rôle USER...');
      userRole = await prisma.role.create({
        data: {
          code: 'USER',
          name: 'Utilisateur',
          description: 'Utilisateur Informaticien'
        }
      });
      console.log('✅ Rôle USER créé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('motdepasse123', 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: 'anderson.aka@cei.ci',
        firstName: 'Anderson',
        lastName: 'Aka',
        password: hashedPassword,
        roleId: userRole.id,
        isActive: true
      },
      include: {
        role: true
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Nom:', user.firstName, user.lastName);
    console.log('Rôle:', user.role.code);
    console.log('Actif:', user.isActive);

    console.log('\n🧪 Vous pouvez maintenant tester avec :');
    console.log('Email: anderson.aka@cei.ci');
    console.log('Mot de passe: motdepasse123');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  await createTestUser();
}

if (require.main === module) {
  main();
}
