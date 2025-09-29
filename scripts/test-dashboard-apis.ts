#!/usr/bin/env ts-node

/**
 * Script de test pour les nouvelles APIs Dashboard
 * Teste tous les endpoints selon les directives
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Configuration axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
      logError(`Erreur ${error.response.status}: ${error.response.data?.message || error.message}`);
    } else {
      logError(`Erreur réseau: ${error.message}`);
    }
    throw error;
  }
);

/**
 * Test d'authentification
 */
async function testAuthentication() {
  logInfo('🔐 Test d\'authentification...');
  
  try {
    // Vous devez adapter ces credentials selon votre base de données
    const loginData = {
      email: 'admin@example.com', // Remplacez par un utilisateur existant
      password: 'password123'     // Remplacez par le mot de passe
    };

    const response = await api.post('/auth/login', loginData);
    authToken = response.data.access_token;
    
    logSuccess(`Authentification réussie pour ${loginData.email}`);
    logInfo(`Token reçu: ${authToken.substring(0, 20)}...`);
    
    return true;
  } catch (error) {
    logError('Échec de l\'authentification');
    logWarning('Assurez-vous que le serveur est démarré et qu\'un utilisateur existe');
    return false;
  }
}

/**
 * Test de l'endpoint principal /metrics
 */
async function testMainMetrics() {
  logInfo('📊 Test de GET /dashboard/metrics...');
  
  try {
    const response = await api.get('/dashboard/metrics');
    const data = response.data;
    
    logSuccess('Métriques principales récupérées');
    logInfo(`Total CELs: ${data.totalCels}`);
    logInfo(`CELs avec import: ${data.celsAvecImport}`);
    logInfo(`Taux de progression: ${data.tauxProgression}%`);
    
    return true;
  } catch (error) {
    logError('Échec de récupération des métriques principales');
    return false;
  }
}

/**
 * Test de l'endpoint user-metrics
 */
async function testUserMetrics() {
  logInfo('👤 Test de GET /dashboard/user-metrics...');
  
  try {
    const response = await api.get('/dashboard/user-metrics');
    const data = response.data;
    
    logSuccess('Métriques utilisateur récupérées');
    logInfo(`CELs assignées: ${data.celsAssignees}`);
    logInfo(`Progression personnelle: ${data.tauxProgressionPersonnel}%`);
    
    return true;
  } catch (error) {
    logError('Échec de récupération des métriques utilisateur');
    return false;
  }
}

/**
 * Test de l'endpoint admin-metrics
 */
async function testAdminMetrics() {
  logInfo('👨‍💼 Test de GET /dashboard/admin-metrics...');
  
  try {
    const response = await api.get('/dashboard/admin-metrics');
    const data = response.data;
    
    logSuccess('Métriques admin récupérées');
    
    if (data.departementsAssignes !== undefined) {
      logInfo(`Départements assignés: ${data.departementsAssignes}`);
      logInfo(`Utilisateurs actifs: ${data.utilisateursActifs}`);
    } else if (data.totalRegions !== undefined) {
      logInfo(`Total régions: ${data.totalRegions}`);
      logInfo(`Total départements: ${data.totalDepartements}`);
      logInfo(`Total utilisateurs: ${data.totalUtilisateurs}`);
    }
    
    return true;
  } catch (error) {
    logError('Échec de récupération des métriques admin');
    return false;
  }
}

/**
 * Test de l'endpoint realtime-metrics
 */
async function testRealtimeMetrics() {
  logInfo('⚡ Test de GET /dashboard/realtime-metrics...');
  
  try {
    const response = await api.get('/dashboard/realtime-metrics');
    const data = response.data;
    
    logSuccess('Métriques temps réel récupérées');
    logInfo(`Timestamp: ${data.timestamp}`);
    logInfo(`Imports aujourd'hui: ${data.activiteRecente.importsAujourdhui}`);
    logInfo(`Imports en cours: ${data.importsEnCours.nombre}`);
    logInfo(`Alertes critiques: ${data.alertesCritiques.celsEnErreurCritique}`);
    
    return true;
  } catch (error) {
    logError('Échec de récupération des métriques temps réel');
    return false;
  }
}

/**
 * Test de l'endpoint refresh-metrics
 */
async function testRefreshMetrics() {
  logInfo('🔄 Test de POST /dashboard/refresh-metrics...');
  
  try {
    const response = await api.post('/dashboard/refresh-metrics');
    const data = response.data;
    
    logSuccess('Rafraîchissement des métriques réussi');
    logInfo(`Message: ${data.message}`);
    logInfo(`Timestamp: ${data.timestamp}`);
    
    return true;
  } catch (error) {
    logError('Échec du rafraîchissement des métriques');
    return false;
  }
}

/**
 * Test des endpoints CELs existants
 */
async function testExistingCelEndpoints() {
  logInfo('📋 Test des endpoints CELs existants...');
  
  const endpoints = [
    '/dashboard/cels',
    '/dashboard/cels/pending-imports',
    '/dashboard/cels/completed-imports',
    '/dashboard/cels/error-imports'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      logSuccess(`${endpoint} - OK (${response.data.total} CELs)`);
      successCount++;
    } catch (error) {
      logError(`${endpoint} - Échec`);
    }
  }
  
  logInfo(`${successCount}/${endpoints.length} endpoints CELs fonctionnels`);
  return successCount === endpoints.length;
}

/**
 * Test de sécurité par rôles
 */
async function testRoleSecurity() {
  logInfo('🔒 Test de sécurité par rôles...');
  
  // Test avec un token invalide
  const originalToken = authToken;
  authToken = 'invalid-token';
  
  try {
    await api.get('/dashboard/metrics');
    logError('Sécurité échouée - token invalide accepté');
    return false;
  } catch (error) {
    logSuccess('Sécurité OK - token invalide rejeté');
  }
  
  // Restaurer le token valide
  authToken = originalToken;
  
  // Test des endpoints restreints
  try {
    await api.get('/dashboard/user-metrics');
    logSuccess('Endpoint user-metrics accessible');
  } catch (error) {
    logWarning('Endpoint user-metrics non accessible (normal si pas USER)');
  }
  
  return true;
}

/**
 * Fonction principale de test
 */
async function runTests() {
  log(`${colors.bold}${colors.blue}🚀 Début des tests des APIs Dashboard${colors.reset}\n`);
  
  const tests = [
    { name: 'Authentification', fn: testAuthentication },
    { name: 'Métriques principales', fn: testMainMetrics },
    { name: 'Métriques utilisateur', fn: testUserMetrics },
    { name: 'Métriques admin', fn: testAdminMetrics },
    { name: 'Métriques temps réel', fn: testRealtimeMetrics },
    { name: 'Rafraîchissement métriques', fn: testRefreshMetrics },
    { name: 'Endpoints CELs existants', fn: testExistingCelEndpoints },
    { name: 'Sécurité par rôles', fn: testRoleSecurity },
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    logInfo(`\n🧪 Test: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`Test ${test.name} a échoué avec une exception`);
    }
  }
  
  log(`\n${colors.bold}📊 Résumé des tests:${colors.reset}`);
  log(`${colors.green}✅ Tests réussis: ${passedTests}/${tests.length}${colors.reset}`);
  log(`${colors.red}❌ Tests échoués: ${tests.length - passedTests}/${tests.length}${colors.reset}`);
  
  if (passedTests === tests.length) {
    log(`\n${colors.green}${colors.bold}🎉 Tous les tests sont passés ! Les APIs Dashboard sont fonctionnelles.${colors.reset}`);
  } else {
    log(`\n${colors.yellow}${colors.bold}⚠️  Certains tests ont échoué. Vérifiez la configuration.${colors.reset}`);
  }
}

// Exécution des tests
if (require.main === module) {
  runTests().catch((error) => {
    logError(`Erreur fatale: ${error.message}`);
    process.exit(1);
  });
}

export { runTests };
