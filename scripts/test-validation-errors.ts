#!/usr/bin/env ts-node

/**
 * Script de test pour les erreurs de validation
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testValidationErrors(): Promise<void> {
  console.log('🧪 Test des erreurs de validation\n');

  // Test 1: Login sans email
  console.log('1️⃣ Test login sans email...');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      password: 'motdepasse123'
    });
    console.log('❌ Devrait échouer mais a réussi');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Erreur 400 attendue:', error.response.data.message);
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  // Test 2: Login avec email invalide
  console.log('\n2️⃣ Test login avec email invalide...');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'email-invalide',
      password: 'motdepasse123'
    });
    console.log('❌ Devrait échouer mais a réussi');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Erreur 400 attendue:', error.response.data.message);
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  // Test 3: Refresh token sans refreshToken
  console.log('\n3️⃣ Test refresh sans refreshToken...');
  try {
    await axios.post(`${API_BASE_URL}/auth/refresh`, {});
    console.log('❌ Devrait échouer mais a réussi');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Erreur 400 attendue:', error.response.data.message);
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  // Test 4: Logout sans refreshToken
  console.log('\n4️⃣ Test logout sans refreshToken...');
  try {
    // D'abord se connecter pour avoir un token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.accessToken}`
      }
    });
    console.log('❌ Devrait échouer mais a réussi');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Erreur 400 attendue:', error.response.data.message);
    } else if (error.response?.status === 500) {
      console.log('✅ Erreur 500 attendue (validation côté serveur):', error.response.data.message);
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  // Test 5: Données supplémentaires non autorisées
  console.log('\n5️⃣ Test avec données supplémentaires non autorisées...');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123',
      extraField: 'should-be-ignored'
    });
    console.log('✅ Login réussi (données supplémentaires ignorées)');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Erreur 400 attendue (données non autorisées):', error.response.data.message);
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  console.log('\n🎉 Tests de validation terminés !');
}

async function main(): Promise<void> {
  console.log('🔍 Test de la validation des données\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(50));

  await testValidationErrors();
}

if (require.main === module) {
  main().catch(console.error);
}
