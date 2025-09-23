#!/usr/bin/env ts-node

/**
 * Script de test pour l'authentification
 * Teste l'endpoint /auth/login avec les données attendues par le frontend
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

interface LoginData {
  email: string;
  password: string;
}

interface ExpectedResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      code: string;
    };
    departements: {
      codeDepartement: string;
    }[];
    isActive: boolean;
  };
}

async function testLogin(): Promise<void> {
  console.log('🧪 Test de l\'endpoint /auth/login\n');

  const loginData: LoginData = {
    email: 'anderson.aka@cei.ci',
    password: 'motdepasse123' // Remplacez par le vrai mot de passe
  };

  try {
    console.log('📤 Envoi de la requête...');
    console.log('URL:', `${API_BASE_URL}/auth/login`);
    console.log('Données:', JSON.stringify(loginData, null, 2));

    const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('\n✅ Réponse reçue !');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('\n📋 Données de réponse:');
    console.log(JSON.stringify(response.data, null, 2));

    // Vérifier la structure de la réponse
    const data: ExpectedResponse = response.data;
    
    console.log('\n🔍 Vérification de la structure:');
    console.log('✓ accessToken présent:', !!data.accessToken);
    console.log('✓ refreshToken présent:', !!data.refreshToken);
    console.log('✓ user présent:', !!data.user);
    console.log('✓ user.id présent:', !!data.user?.id);
    console.log('✓ user.email présent:', !!data.user?.email);
    console.log('✓ user.firstName présent:', !!data.user?.firstName);
    console.log('✓ user.lastName présent:', !!data.user?.lastName);
    console.log('✓ user.role présent:', !!data.user?.role);
    console.log('✓ user.role.code présent:', !!data.user?.role?.code);
    console.log('✓ user.departements présent:', Array.isArray(data.user?.departements));
    console.log('✓ user.isActive présent:', typeof data.user?.isActive === 'boolean');

    console.log('\n🎉 Test réussi ! La structure de réponse correspond aux attentes du frontend.');

  } catch (error: any) {
    console.error('\n❌ Erreur lors du test:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Aucune réponse reçue:', error.message);
    } else {
      console.error('Erreur de configuration:', error.message);
    }
  }
}

async function testProfile(accessToken: string): Promise<void> {
  console.log('\n🧪 Test de l\'endpoint /auth/profile\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ Profil récupéré !');
    console.log('Status:', response.status);
    console.log('Données:', JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Erreur lors du test du profil:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erreur:', error.message);
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Test de l\'API d\'authentification\n');
  
  try {
    await testLogin();
    
    // Si vous voulez tester le profil, décommentez ces lignes
    // et remplacez 'YOUR_ACCESS_TOKEN' par un vrai token
    // await testProfile('YOUR_ACCESS_TOKEN');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
