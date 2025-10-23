import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/v1';

async function checkAllEndpoints() {
  try {
    console.log('🔐 Authentification...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'adminDtic@2025!'
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Authentification réussie !');

    const endpoints = [
      '/elections/election-2025/results/header',
      '/elections/election-2025/results',
      '/elections/election-2025/results/summary',
      '/elections/election-2025/results/candidates'
    ];

    console.log('\n🔍 Vérification de tous les endpoints...');
    console.log('=' .repeat(60));

    for (const endpoint of endpoints) {
      try {
        console.log(`\n📊 Test: ${endpoint}`);
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📝 Message: ${response.data.message}`);
        
        if (response.data.data?.departementsPublies !== undefined) {
          console.log(`📍 Départements: ${JSON.stringify(response.data.data.departementsPublies)}`);
          console.log(`📊 Nombre: ${response.data.data.departementsPublies?.length || 0}`);
        } else {
          console.log(`📍 Départements: Non présent dans cet endpoint`);
        }

        console.log(`🕐 Timestamp: ${response.data.timestamp || response.data.data?.lastUpdate || 'N/A'}`);

      } catch (error) {
        console.log(`❌ Erreur: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🔍 DIAGNOSTIC:');
    console.log('=' .repeat(60));
    console.log('1. Vérifiez que le frontend utilise la bonne URL');
    console.log('2. Vérifiez que le frontend utilise le bon endpoint');
    console.log('3. Videz le cache du navigateur (Ctrl+F5)');
    console.log('4. Vérifiez les logs réseau dans les DevTools');
    console.log('5. Comparez les timestamps avec notre test');

  } catch (error) {
    console.error('❌ Erreur générale:', error.response?.status, error.response?.data?.message || error.message);
  }
}

checkAllEndpoints();
