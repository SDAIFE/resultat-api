#!/usr/bin/env ts-node

/**
 * Script pour réinitialiser le mot de passe de test
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetTestPassword(): Promise<void> {
  console.log('🔑 Réinitialisation du mot de passe de test\n');

  try {
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'anderson.aka@cei.ci' },
      include: { role: true }
    });

    if (!user) {
      console.log('❌ Utilisateur anderson.aka@cei.ci non trouvé');
      return;
    }

    console.log('👤 Utilisateur trouvé :');
    console.log('Nom:', user.firstName, user.lastName);
    console.log('Email:', user.email);
    console.log('Rôle:', user.role.code);
    console.log('Actif:', user.isActive);

    // Hasher le nouveau mot de passe
    const newPassword = 'motdepasse123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('\n✅ Mot de passe mis à jour avec succès !');
    console.log('Nouveau mot de passe:', newPassword);

    console.log('\n🧪 Vous pouvez maintenant tester avec :');
    console.log('Email: anderson.aka@cei.ci');
    console.log('Mot de passe: motdepasse123');

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  await resetTestPassword();
}

if (require.main === module) {
  main();
}
