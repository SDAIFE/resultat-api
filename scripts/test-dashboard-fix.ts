#!/usr/bin/env ts-node

/**
 * Script de test pour vérifier la correction de la limite de paramètres SQL Server
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Configuration axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 secondes pour les requêtes complexes
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
      console.error(`❌ Erreur ${error.response.status}: ${error.response.data?.message || error.message}`);
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
    return true;
  } catch (error) {
    console.error('❌ Échec de l\'authentification');
    console.log('💡 Assurez-vous que le serveur est démarré et qu\'un utilisateur existe');
    return false;
  }
}

/**
 * Test des métriques SADMIN (le plus critique)
 */
async function testSadminMetrics() {
  console.log('🧪 Test des métriques SADMIN...');
  
  const startTime = Date.now();
  
  try {
    const response = await api.get('/dashboard/admin-metrics');
    const data = response.data;
    const endTime = Date.now();
    
    console.log(`✅ Métriques SADMIN récupérées en ${endTime - startTime}ms`);
    console.log(`📊 Total CELs: ${data.totalCels}`);
    console.log(`📊 CELs avec import: ${data.celsAvecImport}`);
    console.log(`📊 Taux de progression: ${data.tauxProgression}%`);
    console.log(`📊 Total régions: ${data.totalRegions}`);
    console.log(`📊 Total départements: ${data.totalDepartements}`);
    
    return true;
  } catch (error) {
    console.error('❌ Échec des métriques SADMIN');
    return false;
  }
}

/**
 * Test des métriques temps réel
 */
async function testRealtimeMetrics() {
  console.log('⚡ Test des métriques temps réel...');
  
  const startTime = Date.now();
  
  try {
    const response = await api.get('/dashboard/realtime-metrics');
    const data = response.data;
    const endTime = Date.now();
    
    console.log(`✅ Métriques temps réel récupérées en ${endTime - startTime}ms`);
    console.log(`🕒 Timestamp: ${data.timestamp}`);
    console.log(`📈 Imports aujourd'hui: ${data.activiteRecente.importsAujourdhui}`);
    console.log(`🔄 Imports en cours: ${data.importsEnCours.nombre}`);
    console.log(`🚨 Alertes critiques: ${data.alertesCritiques.celsEnErreurCritique}`);
    
    return true;
  } catch (error) {
    console.error('❌ Échec des métriques temps réel');
    return false;
  }
}

/**
 * Test de charge (plusieurs requêtes simultanées)
 */
async function testLoad() {
  console.log('🚀 Test de charge...');
  
  const startTime = Date.now();
  
  try {
    // Exécuter 5 requêtes simultanées
    const promises = Array.from({ length: 5 }, (_, i) => 
      api.get('/dashboard/metrics').then(response => ({
        index: i + 1,
        time: Date.now() - startTime,
        data: response.data
      }))
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ ${results.length} requêtes simultanées terminées en ${endTime - startTime}ms`);
    results.forEach(result => {
      console.log(`   Requête ${result.index}: ${result.time}ms`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Échec du test de charge');
    return false;
  }
}

/**
 * Test de mémoire (surveillance des performances)
 */
async function testMemoryUsage() {
  console.log('🧠 Test d\'utilisation mémoire...');
  
  const startMemory = process.memoryUsage();
  const startTime = Date.now();
  
  try {
    // Exécuter plusieurs requêtes pour tester la mémoire
    for (let i = 0; i < 10; i++) {
      await api.get('/dashboard/metrics');
      await api.get('/dashboard/realtime-metrics');
    }
    
    const endMemory = process.memoryUsage();
    const endTime = Date.now();
    
    const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
    const memoryDiffMB = (memoryDiff / 1024 / 1024).toFixed(2);
    
    console.log(`✅ Test mémoire terminé en ${endTime - startTime}ms`);
    console.log(`📊 Utilisation mémoire: +${memoryDiffMB}MB`);
    console.log(`📊 Mémoire totale: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    return true;
  } catch (error) {
    console.error('❌ Échec du test mémoire');
    return false;
  }
}

/**
 * Fonction principale de test
 */
async function runTests() {
  console.log('🚀 Début des tests de correction SQL Server\n');
  
  // Authentification
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Impossible de continuer sans authentification');
    return;
  }
  
  console.log('\n📋 Tests de correction:');
  
  const tests = [
    { name: 'Métriques SADMIN', fn: testSadminMetrics },
    { name: 'Métriques temps réel', fn: testRealtimeMetrics },
    { name: 'Test de charge', fn: testLoad },
    { name: 'Test mémoire', fn: testMemoryUsage },
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
    console.log(`\n🎉 Tous les tests sont passés ! La correction SQL Server est fonctionnelle.`);
  } else {
    console.log(`\n⚠️  Certains tests ont échoué. Vérifiez la configuration.`);
  }
}

// Exécution des tests
if (require.main === module) {
  runTests().catch((error) => {
    console.error(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
  });
}

export { runTests };
