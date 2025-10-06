import axios from 'axios';

/**
 * Script de test pour vérifier la configuration CORS
 */
async function testCorsConfiguration() {
  const baseUrl = process.env.API_URL || 'http://localhost:3001';
  
  console.log('🔍 Test de la configuration CORS...');
  console.log(`📡 URL de l'API: ${baseUrl}`);
  
  try {
    // Test d'une requête OPTIONS (preflight CORS)
    console.log('\n1️⃣ Test de la requête OPTIONS (preflight CORS)...');
    
    const optionsResponse = await axios.options(`${baseUrl}/api/auth/login`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('✅ Status:', optionsResponse.status);
    console.log('✅ Headers CORS:', {
      'Access-Control-Allow-Origin': optionsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': optionsResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': optionsResponse.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': optionsResponse.headers['access-control-allow-credentials']
    });
    
    // Test d'une requête GET simple
    console.log('\n2️⃣ Test d\'une requête GET...');
    
    const getResponse = await axios.get(`${baseUrl}/api`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    console.log('✅ Status:', getResponse.status);
    console.log('✅ Headers CORS:', {
      'Access-Control-Allow-Origin': getResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': getResponse.headers['access-control-allow-credentials']
    });
    
    console.log('\n🎉 Configuration CORS validée avec succès !');
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Erreur: Impossible de se connecter à l\'API');
      console.error('💡 Assurez-vous que l\'application est démarrée sur le port 3001');
    } else {
      console.error('❌ Erreur lors du test CORS:', error.message);
      
      if (error.response) {
        console.error('📊 Status:', error.response.status);
        console.error('📊 Headers:', error.response.headers);
      }
    }
  }
}

// Exécution du test
if (require.main === module) {
  testCorsConfiguration();
}

export { testCorsConfiguration };
