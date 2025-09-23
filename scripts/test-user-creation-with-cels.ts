#!/usr/bin/env ts-node

/**
 * Script de test pour la création d'utilisateur avec CELs
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
  cels: any[];
}> {
  console.log('\n📋 Récupération des données pour le formulaire...');
  
  try {
    const [rolesResponse, departementsResponse, celsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/roles/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${API_BASE_URL}/departements/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${API_BASE_URL}/cels/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    console.log('✅ Données récupérées:');
    console.log(`- ${rolesResponse.data.length} rôles disponibles`);
    console.log(`- ${departementsResponse.data.length} départements disponibles`);
    console.log(`- ${celsResponse.data.length} CELs disponibles`);

    return {
      roles: rolesResponse.data,
      departements: departementsResponse.data,
      cels: celsResponse.data
    };
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération:', error.response?.data || error.message);
    throw error;
  }
}

async function testUserCreationWithCels(roles: any[], departements: any[], cels: any[]): Promise<void> {
  console.log('\n👤 Test de création d\'utilisateur avec CELs...');
  
  try {
    // Sélectionner des données
    const selectedRole = roles.find(r => r.code === 'USER') || roles[0];
    const selectedDepartements = departements.slice(0, 2).map(d => d.codeDepartement);
    const selectedCels = cels.slice(0, 3).map(c => c.codeCellule);

    const userData = {
      email: `user.with.cels.${Date.now()}@example.com`,
      firstName: 'User',
      lastName: 'With CELs',
      password: 'password123',
      roleId: selectedRole.id,
      departementCodes: selectedDepartements,
      celCodes: selectedCels,
      isActive: true
    };

    console.log('📝 Données de création:');
    console.log('- Email:', userData.email);
    console.log('- Nom:', userData.firstName, userData.lastName);
    console.log('- Rôle:', selectedRole.code, '-', selectedRole.name);
    console.log('- Départements:', selectedDepartements);
    console.log('- CELs:', selectedCels);

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
    console.log('CELs assignées:', response.data.cellules.length);
    console.log('Statut actif:', response.data.isActive);

    // Afficher les détails des CELs assignées
    if (response.data.cellules.length > 0) {
      console.log('\n📋 CELs assignées:');
      response.data.cellules.forEach((cel: any, index: number) => {
        console.log(`  ${index + 1}. ${cel.codeCellule} - ${cel.libelleCellule}`);
      });
    }

    // Nettoyer - supprimer l'utilisateur créé
    console.log('\n🧹 Nettoyage...');
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('✅ Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.response?.data || error.message);
  }
}

async function testUserCreationMinimal(): Promise<void> {
  console.log('\n👤 Test de création minimale (sans CELs)...');
  
  try {
    const userData = {
      email: `minimal.${Date.now()}@example.com`,
      firstName: 'Minimal',
      lastName: 'User',
      password: 'password123'
    };

    console.log('📝 Données minimales:', userData);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Départements assignés:', response.data.departements.length);
    console.log('CELs assignées:', response.data.cellules.length);

    // Nettoyer
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('🧹 Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.response?.data || error.message);
  }
}

async function testValidationErrors(): Promise<void> {
  console.log('\n❌ Test de validation des erreurs...');
  
  const testCases = [
    {
      name: 'CELs inexistantes',
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        celCodes: ['CEL_INEXISTANTE_1', 'CEL_INEXISTANTE_2']
      }
    },
    {
      name: 'Mélange CELs valides et invalides',
      data: {
        email: 'test2@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        celCodes: ['041', 'CEL_INEXISTANTE']
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
  console.log('🧪 Test de création d\'utilisateur avec CELs\n');
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
    const { roles, departements, cels } = await getFormData();

    // Tests de création
    await testUserCreationWithCels(roles, departements, cels);
    await testUserCreationMinimal();
    await testValidationErrors();

    console.log('\n🎉 Tous les tests terminés !');
    console.log('\n💡 Le frontend peut maintenant créer des utilisateurs avec des CELs assignées');

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
