#!/usr/bin/env ts-node

/**
 * Script de test spécifique pour debug du dashboard
 * Vérifie que les endpoints retournent la structure attendue par le frontend
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Configuration axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Intercepteur pour ajouter le token d'auth
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`❌ Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`❌ Erreur réseau: ${error.message}`);
    }
    throw error;
  }
);

/**
 * Test d'authentification
 */
async function authenticate() {
  console.log('🔐 Authentification...');
  
  try {
    const loginData = {
      email: 'admin@example.com', // Remplacez par un utilisateur existant
      password: 'password123'     // Remplacez par le mot de passe
    };

    const response = await api.post('/auth/login', loginData);
    authToken = response.data.access_token;
    
    console.log(`✅ Authentification réussie`);
    console.log(`👤 Utilisateur: ${loginData.email}`);
    console.log(`🔑 Token: ${authToken.substring(0, 20)}...`);
    
    return true;
  } catch (error) {
    console.error('❌ Échec de l\'authentification');
    console.log('💡 Assurez-vous que le serveur est démarré et qu\'un utilisateur existe');
    return false;
  }
}

/**
 * Test de la structure de réponse USER
 */
async function testUserMetricsStructure() {
  console.log('\n🧪 Test structure USER metrics...');
  
  try {
    const response = await api.get('/dashboard/user-metrics');
    const data = response.data;
    
    console.log('📊 Réponse reçue:');
    console.log(JSON.stringify(data, null, 2));
    
    // Vérifier la structure attendue
    const requiredFields = ['success', 'data', 'message'];
    const dataFields = ['totalCels', 'celsAvecImport', 'celsSansImport', 'tauxProgression'];
    
    let isValid = true;
    
    // Vérifier les champs principaux
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ Champ manquant: ${field}`);
        isValid = false;
      }
    }
    
    // Vérifier les champs de données
    if (data.data) {
      for (const field of dataFields) {
        if (!(field in data.data)) {
          console.error(`❌ Champ data manquant: ${field}`);
          isValid = false;
        }
      }
    } else {
      console.error('❌ Champ data manquant');
      isValid = false;
    }
    
    if (isValid) {
      console.log('✅ Structure USER metrics conforme');
      console.log(`📈 Total CELs: ${data.data.totalCels}`);
      console.log(`📈 CELs avec import: ${data.data.celsAvecImport}`);
      console.log(`📈 Taux progression: ${data.data.tauxProgression}%`);
    } else {
      console.log('❌ Structure USER metrics non conforme');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Erreur test USER metrics');
    return false;
  }
}

/**
 * Test de la structure de réponse ADMIN
 */
async function testAdminMetricsStructure() {
  console.log('\n🧪 Test structure ADMIN metrics...');
  
  try {
    const response = await api.get('/dashboard/admin-metrics');
    const data = response.data;
    
    console.log('📊 Réponse reçue:');
    console.log(JSON.stringify(data, null, 2));
    
    // Vérifier la structure attendue
    const requiredFields = ['success', 'data', 'message'];
    const dataFields = ['totalCels', 'celsAvecImport', 'celsSansImport', 'tauxProgression'];
    
    let isValid = true;
    
    // Vérifier les champs principaux
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ Champ manquant: ${field}`);
        isValid = false;
      }
    }
    
    // Vérifier les champs de données
    if (data.data) {
      for (const field of dataFields) {
        if (!(field in data.data)) {
          console.error(`❌ Champ data manquant: ${field}`);
          isValid = false;
        }
      }
    } else {
      console.error('❌ Champ data manquant');
      isValid = false;
    }
    
    if (isValid) {
      console.log('✅ Structure ADMIN metrics conforme');
      console.log(`📈 Total CELs: ${data.data.totalCels}`);
      console.log(`📈 CELs avec import: ${data.data.celsAvecImport}`);
      console.log(`📈 Taux progression: ${data.data.tauxProgression}%`);
    } else {
      console.log('❌ Structure ADMIN metrics non conforme');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Erreur test ADMIN metrics');
    return false;
  }
}

/**
 * Test de la structure de réponse métriques générales
 */
async function testGeneralMetricsStructure() {
  console.log('\n🧪 Test structure métriques générales...');
  
  try {
    const response = await api.get('/dashboard/metrics');
    const data = response.data;
    
    console.log('📊 Réponse reçue:');
    console.log(JSON.stringify(data, null, 2));
    
    // Vérifier la structure attendue
    const requiredFields = ['success', 'data', 'message'];
    
    let isValid = true;
    
    // Vérifier les champs principaux
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ Champ manquant: ${field}`);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log('✅ Structure métriques générales conforme');
      console.log(`📈 Total CELs: ${data.data.totalCels}`);
      console.log(`📈 CELs avec import: ${data.data.celsAvecImport}`);
      console.log(`📈 Taux progression: ${data.data.tauxProgression}%`);
    } else {
      console.log('❌ Structure métriques générales non conforme');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Erreur test métriques générales');
    return false;
  }
}

/**
 * Test de la structure de réponse temps réel
 */
async function testRealtimeMetricsStructure() {
  console.log('\n🧪 Test structure métriques temps réel...');
  
  try {
    const response = await api.get('/dashboard/realtime-metrics');
    const data = response.data;
    
    console.log('📊 Réponse reçue:');
    console.log(JSON.stringify(data, null, 2));
    
    // Vérifier la structure attendue
    const requiredFields = ['success', 'data', 'message'];
    
    let isValid = true;
    
    // Vérifier les champs principaux
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ Champ manquant: ${field}`);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log('✅ Structure métriques temps réel conforme');
      console.log(`🕒 Timestamp: ${data.data.timestamp}`);
      console.log(`📈 Imports aujourd'hui: ${data.data.activiteRecente?.importsAujourdhui || 'N/A'}`);
    } else {
      console.log('❌ Structure métriques temps réel non conforme');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Erreur test métriques temps réel');
    return false;
  }
}

/**
 * Test de simulation frontend
 */
async function testFrontendSimulation() {
  console.log('\n🧪 Test simulation frontend...');
  
  try {
    // Simuler l'appel frontend
    const response = await api.get('/dashboard/user-metrics');
    const data = response.data;
    
    // Simuler le traitement frontend
    if (data.success && data.data) {
      console.log('✅ Frontend peut traiter la réponse');
      console.log(`📊 Données disponibles: ${Object.keys(data.data).length} champs`);
      
      // Simuler l'affichage des métriques
      const metrics = data.data;
      console.log('\n📈 Métriques affichées:');
      console.log(`   Total CELs: ${metrics.totalCels}`);
      console.log(`   CELs importées: ${metrics.celsAvecImport}`);
      console.log(`   CELs restantes: ${metrics.celsSansImport}`);
      console.log(`   Taux de progression: ${metrics.tauxProgression}%`);
      
      return true;
    } else {
      console.log('❌ Frontend ne peut pas traiter la réponse');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur simulation frontend');
    return false;
  }
}

/**
 * Fonction principale de test
 */
async function runDebugTests() {
  console.log('🚀 Début des tests de debug dashboard\n');
  
  // Authentification
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Impossible de continuer sans authentification');
    return;
  }
  
  console.log('\n📋 Tests de structure:');
  
  const tests = [
    { name: 'Structure USER metrics', fn: testUserMetricsStructure },
    { name: 'Structure ADMIN metrics', fn: testAdminMetricsStructure },
    { name: 'Structure métriques générales', fn: testGeneralMetricsStructure },
    { name: 'Structure métriques temps réel', fn: testRealtimeMetricsStructure },
    { name: 'Simulation frontend', fn: testFrontendSimulation },
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 ${test.name}...`);
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} a échoué avec une exception`);
    }
  }
  
  console.log(`\n📊 Résumé des tests:`);
  console.log(`✅ Tests réussis: ${passedTests}/${tests.length}`);
  console.log(`❌ Tests échoués: ${tests.length - passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log(`\n🎉 Tous les tests sont passés ! Le frontend devrait maintenant recevoir les données.`);
  } else {
    console.log(`\n⚠️  Certains tests ont échoué. Vérifiez la structure des réponses.`);
  }
}

// Exécution des tests
if (require.main === module) {
  runDebugTests().catch((error) => {
    console.error(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
  });
}

export { runDebugTests };
