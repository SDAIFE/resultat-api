#!/usr/bin/env ts-node

/**
 * Script de configuration des rôles et création du Super Administrateur
 * 
 * Ce script :
 * 1. Crée tous les rôles de base nécessaires à l'application
 * 2. Crée le Super Administrateur avec les informations spécifiées
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Définition des rôles de base
const ROLES_TO_CREATE = [
  {
    code: 'SADMIN',
    name: 'Super Administrateur',
    description: 'Accès complet au système - Gestion de tous les utilisateurs et données'
  },
  {
    code: 'ADMIN',
    name: 'Administrateur',
    description: 'Administration des utilisateurs et données - Gestion des imports et publications'
  },
  {
    code: 'USER',
    name: 'Utilisateur',
    description: 'Utilisateur Informaticien - Import et gestion des données de sa CEL'
  }
];

// Informations du Super Administrateur
const SUPER_ADMIN_INFO = {
  email: 'anderson.aka@cei.ci',
  firstName: 'Anderson',
  lastName: 'Aka',
  password: 'adminDtic@2025!',
  roleCode: 'SADMIN'
};

async function createRoles(): Promise<void> {
  console.log('🔐 Création des rôles de base...\n');

  for (const roleData of ROLES_TO_CREATE) {
    try {
      // Vérifier si le rôle existe déjà
      const existingRole = await prisma.role.findUnique({
        where: { code: roleData.code }
      });

      if (existingRole) {
        console.log(`⚠️  Le rôle ${roleData.code} existe déjà`);
        console.log(`   Nom: ${existingRole.name}`);
        console.log(`   Description: ${existingRole.description}`);
      } else {
        // Créer le rôle
        const role = await prisma.role.create({
          data: {
            code: roleData.code,
            name: roleData.name,
            description: roleData.description
          }
        });

        console.log(`✅ Rôle ${roleData.code} créé avec succès`);
        console.log(`   ID: ${role.id}`);
        console.log(`   Nom: ${role.name}`);
        console.log(`   Description: ${role.description}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la création du rôle ${roleData.code}:`, error);
    }
    console.log(''); // Ligne vide pour la lisibilité
  }
}

async function createSuperAdmin(): Promise<void> {
  console.log('👑 Création du Super Administrateur...\n');

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_INFO.email }
    });

    if (existingUser) {
      console.log(`⚠️  L'utilisateur ${SUPER_ADMIN_INFO.email} existe déjà`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Nom: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log(`   Actif: ${existingUser.isActive}`);
      
      // Vérifier le rôle actuel
      const userWithRole = await prisma.user.findUnique({
        where: { id: existingUser.id },
        include: { role: true }
      });
      
      if (userWithRole?.role.code === 'SADMIN') {
        console.log(`   Rôle: ${userWithRole.role.code} - ${userWithRole.role.name}`);
        console.log('✅ Super Administrateur déjà configuré correctement');
      } else {
        console.log(`   Rôle actuel: ${userWithRole?.role.code || 'Non défini'}`);
        console.log('⚠️  Le rôle doit être mis à jour vers SADMIN');
        
        // Mettre à jour le rôle vers SADMIN
        const sadminRole = await prisma.role.findUnique({
          where: { code: 'SADMIN' }
        });
        
        if (sadminRole) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { roleId: sadminRole.id }
          });
          console.log('✅ Rôle mis à jour vers SADMIN');
        }
      }
      return;
    }

    // Vérifier que le rôle SADMIN existe
    const sadminRole = await prisma.role.findUnique({
      where: { code: SUPER_ADMIN_INFO.roleCode }
    });

    if (!sadminRole) {
      console.error(`❌ Le rôle ${SUPER_ADMIN_INFO.roleCode} n'existe pas. Veuillez d'abord créer les rôles.`);
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_INFO.password, 12);

    // Créer le Super Administrateur
    const superAdmin = await prisma.user.create({
      data: {
        email: SUPER_ADMIN_INFO.email,
        firstName: SUPER_ADMIN_INFO.firstName,
        lastName: SUPER_ADMIN_INFO.lastName,
        password: hashedPassword,
        roleId: sadminRole.id,
        isActive: true
      },
      include: {
        role: true
      }
    });

    console.log('✅ Super Administrateur créé avec succès !');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Nom: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Rôle: ${superAdmin.role.code} - ${superAdmin.role.name}`);
    console.log(`   Actif: ${superAdmin.isActive}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création du Super Administrateur:', error);
  }
}

async function displaySummary(): Promise<void> {
  console.log('\n📊 Résumé de la configuration...\n');

  try {
    // Lister tous les rôles
    const roles = await prisma.role.findMany({
      orderBy: { code: 'asc' }
    });

    console.log('🔐 Rôles disponibles:');
    roles.forEach(role => {
      console.log(`   ${role.code} - ${role.name}`);
      console.log(`      Description: ${role.description}`);
    });

    console.log('\n👑 Super Administrateur:');
    const superAdmin = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_INFO.email },
      include: { role: true }
    });

    if (superAdmin) {
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Nom: ${superAdmin.firstName} ${superAdmin.lastName}`);
      console.log(`   Rôle: ${superAdmin.role.code} - ${superAdmin.role.name}`);
      console.log(`   Actif: ${superAdmin.isActive}`);
      
      console.log('\n🧪 Informations de connexion:');
      console.log(`   Email: ${SUPER_ADMIN_INFO.email}`);
      console.log(`   Mot de passe: ${SUPER_ADMIN_INFO.password}`);
    } else {
      console.log('   ❌ Super Administrateur non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage du résumé:', error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Configuration des rôles et création du Super Administrateur\n');
  console.log('=' .repeat(70));

  try {
    // 1. Créer les rôles
    await createRoles();

    // 2. Créer le Super Administrateur
    await createSuperAdmin();

    // 3. Afficher le résumé
    await displaySummary();

    console.log('\n✅ Configuration terminée avec succès !');
    console.log('\n💡 Vous pouvez maintenant :');
    console.log('   1. Vous connecter avec le Super Administrateur');
    console.log('   2. Créer d\'autres utilisateurs via l\'API');
    console.log('   3. Assigner des rôles aux utilisateurs');

  } catch (error) {
    console.error('\n❌ Erreur générale lors de la configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
