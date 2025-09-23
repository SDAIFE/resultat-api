#!/usr/bin/env ts-node

/**
 * Script de test pour les listes simples (départements et CELs)
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

async function testDepartementsList(): Promise<void> {
  console.log('\n🏢 Test de la liste des départements...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/departements/list/simple`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Liste des départements récupérée avec succès');
    console.log('Nombre de départements:', response.data.length);
    console.log('\n📋 Premiers départements:');
    
    response.data.slice(0, 5).forEach((dept: any, index: number) => {
      console.log(`${index + 1}. ${dept.codeDepartement} - ${dept.libelleDepartement}`);
    });

    if (response.data.length > 5) {
      console.log(`... et ${response.data.length - 5} autres départements`);
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des départements:', error.response?.data || error.message);
  }
}

async function testCelsList(): Promise<void> {
  console.log('\n🏛️ Test de la liste des CELs...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/cels/list/simple`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Liste des CELs récupérée avec succès');
    console.log('Nombre de CELs:', response.data.length);
    console.log('\n📋 Premières CELs:');
    
    response.data.slice(0, 5).forEach((cel: any, index: number) => {
      console.log(`${index + 1}. ${cel.codeCellule} - ${cel.libelleCellule}`);
    });

    if (response.data.length > 5) {
      console.log(`... et ${response.data.length - 5} autres CELs`);
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des CELs:', error.response?.data || error.message);
  }
}

async function testCreateUserWithLists(): Promise<void> {
  console.log('\n👤 Test de création d\'utilisateur avec les listes...');
  
  try {
    // Récupérer les listes
    const [departementsResponse, celsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/departements/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${API_BASE_URL}/cels/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    const departements = departementsResponse.data;
    const cels = celsResponse.data;

    console.log('✅ Listes récupérées:');
    console.log(`- ${departements.length} départements disponibles`);
    console.log(`- ${cels.length} CELs disponibles`);

    // Simuler la création d'un utilisateur avec des données des listes
    const userData = {
      email: 'test.with.lists@example.com',
      firstName: 'Test',
      lastName: 'With Lists',
      password: 'motdepasse123',
      departementCodes: departements.slice(0, 2).map((d: any) => d.codeDepartement),
      isActive: true
    };

    console.log('\n📝 Données de création d\'utilisateur:');
    console.log('Email:', userData.email);
    console.log('Départements sélectionnés:', userData.departementCodes);

    // Note: On ne crée pas vraiment l'utilisateur pour éviter les doublons
    console.log('✅ Simulation de création réussie (utilisateur non créé)');

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test des listes simples pour les formulaires\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(60));

  // Connexion
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  // Tests
  await testDepartementsList();
  await testCelsList();
  await testCreateUserWithLists();

  console.log('\n🎉 Tests des listes terminés !');
  console.log('\n💡 Ces listes peuvent être utilisées dans les formulaires de création d\'utilisateurs');
}

if (require.main === module) {
  main().catch(console.error);
}
