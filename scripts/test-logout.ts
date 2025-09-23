#!/usr/bin/env ts-node

/**
 * Script de test spécifique pour la déconnexion
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testLogout(): Promise<void> {
  console.log('🚪 Test de la déconnexion\n');

  try {
    // 1. Se connecter d'abord
    console.log('1️⃣ Connexion...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    const { accessToken, refreshToken } = loginResponse.data;
    console.log('✅ Connexion réussie');
    console.log('Access Token:', accessToken.substring(0, 50) + '...');
    console.log('Refresh Token:', refreshToken.substring(0, 20) + '...');

    // 2. Tester la déconnexion
    console.log('\n2️⃣ Test de déconnexion...');
    console.log('Données envoyées:', { refreshToken });
    
    const logoutResponse = await axios.post(`${API_BASE_URL}/auth/logout`, {
      refreshToken
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Déconnexion réussie !');
    console.log('Status:', logoutResponse.status);
    console.log('Réponse:', JSON.stringify(logoutResponse.data, null, 2));

    // 3. Vérifier que le token est bien invalidé
    console.log('\n3️⃣ Vérification de l\'invalidation du token...');
    
    try {
      await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('⚠️  Le token devrait être invalidé mais fonctionne encore');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Token correctement invalidé (401 Unauthorized)');
      } else {
        console.log('❌ Erreur inattendue:', error.response?.data || error.message);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Erreur lors du test de déconnexion:');
    
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

async function testRefreshToken(): Promise<void> {
  console.log('\n🔄 Test du rafraîchissement de token\n');

  try {
    // 1. Se connecter
    console.log('1️⃣ Connexion...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    const { refreshToken } = loginResponse.data;
    console.log('✅ Connexion réussie');

    // 2. Rafraîchir le token
    console.log('\n2️⃣ Rafraîchissement du token...');
    console.log('Données envoyées:', { refreshToken });
    
    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });

    console.log('✅ Token rafraîchi avec succès !');
    console.log('Status:', refreshResponse.status);
    console.log('Nouveau Access Token:', refreshResponse.data.accessToken.substring(0, 50) + '...');

  } catch (error: any) {
    console.error('\n❌ Erreur lors du test de rafraîchissement:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erreur:', error.message);
    }
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test des endpoints d\'authentification avec validation\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(60));

  await testLogout();
  await testRefreshToken();

  console.log('\n🎉 Tests terminés !');
}

if (require.main === module) {
  main().catch(console.error);
}
