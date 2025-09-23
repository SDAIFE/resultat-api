#!/usr/bin/env ts-node

/**
 * Script de test complet pour la création d'utilisateur avec toutes les options
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

let accessToken: string;

async function login(): Promise<boolean> {
  console.log('🔐 Connexion...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    accessToken = response.data.accessToken;
    console.log('✅ Connexion réussie');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return false;
  }
}

async function getFormData(): Promise<{
  roles: any[];
  departements: any[];
}> {
  console.log('\n📋 Récupération des données pour le formulaire...');
  
  try {
    const [rolesResponse, departementsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/roles/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${API_BASE_URL}/departements/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    console.log('✅ Données récupérées:');
    console.log(`- ${rolesResponse.data.length} rôles disponibles`);
    console.log(`- ${departementsResponse.data.length} départements disponibles`);

    return {
      roles: rolesResponse.data,
      departements: departementsResponse.data
    };
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération:', error.response?.data || error.message);
    throw error;
  }
}

async function testMinimalUserCreation(): Promise<void> {
  console.log('\n👤 Test 1: Création minimale (données obligatoires seulement)...');
  
  try {
    const userData = {
      email: `minimal.${Date.now()}@example.com`,
      firstName: 'Minimal',
      lastName: 'User',
      password: 'password123'
    };

    console.log('📝 Données:', userData);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Rôle par défaut:', response.data.role.code);
    console.log('Statut actif:', response.data.isActive);

    // Nettoyer
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('🧹 Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

async function testCompleteUserCreation(roles: any[], departements: any[]): Promise<void> {
  console.log('\n👤 Test 2: Création complète (toutes les options)...');
  
  try {
    // Sélectionner un rôle et des départements
    const selectedRole = roles.find(r => r.code === 'ADMIN') || roles[0];
    const selectedDepartements = departements.slice(0, 3).map(d => d.codeDepartement);

    const userData = {
      email: `complete.${Date.now()}@example.com`,
      firstName: 'Complete',
      lastName: 'User',
      password: 'password123',
      roleId: selectedRole.id,
      departementCodes: selectedDepartements,
      isActive: true
    };

    console.log('📝 Données complètes:');
    console.log('- Email:', userData.email);
    console.log('- Nom:', userData.firstName, userData.lastName);
    console.log('- Rôle:', selectedRole.code, '-', selectedRole.name);
    console.log('- Départements:', selectedDepartements);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Rôle:', response.data.role.code, '-', response.data.role.name);
    console.log('Départements assignés:', response.data.departements.length);
    console.log('Statut actif:', response.data.isActive);

    // Nettoyer
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('🧹 Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

async function testUserWithSpecificRole(roles: any[]): Promise<void> {
  console.log('\n👤 Test 3: Création avec rôle spécifique (USER)...');
  
  try {
    const userRole = roles.find(r => r.code === 'USER');
    if (!userRole) {
      console.log('❌ Rôle USER non trouvé');
      return;
    }

    const userData = {
      email: `user.role.${Date.now()}@example.com`,
      firstName: 'User',
      lastName: 'Role',
      password: 'password123',
      roleId: userRole.id,
      isActive: true
    };

    console.log('📝 Données avec rôle USER:');
    console.log('- Email:', userData.email);
    console.log('- Rôle:', userRole.code, '-', userRole.name);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Rôle confirmé:', response.data.role.code, '-', response.data.role.name);

    // Nettoyer
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('🧹 Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

async function testValidationErrors(): Promise<void> {
  console.log('\n❌ Test 4: Validation des erreurs...');
  
  const testCases = [
    {
      name: 'Email invalide',
      data: {
        email: 'email-invalide',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123'
      }
    },
    {
      name: 'Mot de passe trop court',
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: '123'
      }
    },
    {
      name: 'Prénom manquant',
      data: {
        email: 'test@example.com',
        lastName: 'User',
        password: 'password123'
      }
    },
    {
      name: 'Rôle inexistant',
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        roleId: 'ROLE_INEXISTANT'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Test: ${testCase.name}`);
      console.log('Données:', testCase.data);

      await axios.post(`${API_BASE_URL}/users`, testCase.data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('❌ Erreur: La validation aurait dû échouer !');

    } catch (error: any) {
      console.log('✅ Validation correcte - Erreur attendue:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.response?.data?.message);
    }
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test complet de création d\'utilisateur\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(60));

  // Connexion
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  try {
    // Récupérer les données du formulaire
    const { roles, departements } = await getFormData();

    // Tests de création
    await testMinimalUserCreation();
    await testCompleteUserCreation(roles, departements);
    await testUserWithSpecificRole(roles);
    await testValidationErrors();

    console.log('\n🎉 Tous les tests terminés !');
    console.log('\n💡 Le frontend peut maintenant implémenter la création d\'utilisateurs avec toutes ces options');

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
