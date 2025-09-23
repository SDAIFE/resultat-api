#!/usr/bin/env ts-node

/**
 * Script de test complet pour tous les endpoints de l'API
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

interface AuthResponse {
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

async function testLogin(): Promise<AuthResponse | null> {
  console.log('🔐 Test de connexion...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    console.log('✅ Connexion réussie');
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return null;
  }
}

async function testProfile(accessToken: string): Promise<void> {
  console.log('\n👤 Test du profil utilisateur...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Profil récupéré avec succès');
    console.log('Données:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération du profil:', error.response?.data || error.message);
  }
}

async function testVerify(accessToken: string): Promise<void> {
  console.log('\n🔍 Test de vérification du token...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Token vérifié avec succès');
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification du token:', error.response?.data || error.message);
  }
}

async function testRefresh(refreshToken: string): Promise<string | null> {
  console.log('\n🔄 Test de rafraîchissement du token...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });

    console.log('✅ Token rafraîchi avec succès');
    console.log('Nouveau accessToken:', response.data.accessToken);
    return response.data.accessToken;
  } catch (error: any) {
    console.error('❌ Erreur lors du rafraîchissement:', error.response?.data || error.message);
    return null;
  }
}

async function testLogout(refreshToken: string): Promise<void> {
  console.log('\n🚪 Test de déconnexion...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`, {
      refreshToken
    });

    console.log('✅ Déconnexion réussie');
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Erreur lors de la déconnexion:', error.response?.data || error.message);
  }
}

async function testMonitoring(): Promise<void> {
  console.log('\n📊 Test des endpoints de monitoring...');
  
  try {
    // Test des statistiques
    const statsResponse = await axios.get(`${API_BASE_URL}/monitoring/stats`);
    console.log('✅ Statistiques récupérées');
    console.log('Total requêtes:', statsResponse.data.totalQueries);
    
    // Test du rapport
    const reportResponse = await axios.get(`${API_BASE_URL}/monitoring/report`);
    console.log('✅ Rapport de performance récupéré');
    console.log('Rapport:', reportResponse.data.report);
    
  } catch (error: any) {
    console.error('❌ Erreur lors du test du monitoring:', error.response?.data || error.message);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Test complet de l\'API avec préfixe /api\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(50));

  // Test de connexion
  const authData = await testLogin();
  if (!authData) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  const { accessToken, refreshToken } = authData;

  // Test du profil
  await testProfile(accessToken);

  // Test de vérification
  await testVerify(accessToken);

  // Test de rafraîchissement
  const newAccessToken = await testRefresh(refreshToken);

  // Test du monitoring
  await testMonitoring();

  // Test de déconnexion
  await testLogout(refreshToken);

  console.log('\n🎉 Tests terminés !');
  console.log('✅ Tous les endpoints fonctionnent avec le préfixe /api');
}

if (require.main === module) {
  main().catch(console.error);
}
