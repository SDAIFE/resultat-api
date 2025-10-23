import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/v1';

async function diagnoseDepartementsPublies() {
  try {
    console.log('🔐 Authentification...');
    
    // Authentification
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'adminDtic@2025!'
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Authentification réussie !');

    // Test de l'endpoint header
    console.log('\n📊 Test de l\'endpoint Header...');
    
    const response = await axios.get(`${BASE_URL}/elections/election-2025/results/header`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Header - Succès !');
    console.log('📈 Départements publiés:', response.data.data.departementsPublies);
    console.log('📊 Nombre de départements:', response.data.data.departementsPublies?.length || 0);

    // Test de l'endpoint départements
    console.log('\n🏛️ Test de l\'endpoint Départements...');
    
    try {
      const deptResponse = await axios.get(`${BASE_URL}/departements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Départements - Succès !');
      console.log('📊 Nombre total de départements:', deptResponse.data?.length || 0);
      
      if (deptResponse.data && deptResponse.data.length > 0) {
        console.log('\n📋 Liste des départements:');
        deptResponse.data.forEach((dept: any, index: number) => {
          console.log(`  ${index + 1}. ${dept.libelleDepartement || dept.nom || dept.name} (${dept.statutPublication || dept.status || 'N/A'})`);
        });
      }

    } catch (error) {
      console.log('❌ Erreur départements:', error.response?.status, error.response?.data?.message);
    }

    // Test de l'endpoint régions
    console.log('\n🌍 Test de l\'endpoint Régions...');
    
    try {
      const regionResponse = await axios.get(`${BASE_URL}/regions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Régions - Succès !');
      console.log('📊 Nombre total de régions:', regionResponse.data?.length || 0);
      
      if (regionResponse.data && regionResponse.data.length > 0) {
        console.log('\n📋 Liste des régions:');
        regionResponse.data.forEach((region: any, index: number) => {
          console.log(`  ${index + 1}. ${region.libelleRegion || region.nom || region.name}`);
        });
      }

    } catch (error) {
      console.log('❌ Erreur régions:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n🔍 DIAGNOSTIC:');
    console.log('=' .repeat(50));
    console.log('1. L\'endpoint header retourne:', response.data.data.departementsPublies?.length || 0, 'départements');
    console.log('2. Vérifiez la valeur de statutPublication dans la base de données');
    console.log('3. Les valeurs possibles peuvent être: PUBLIE, PUBLIÉ, PUBLISHED, etc.');
    console.log('4. Le frontend reçoit une liste vide car aucun département n\'a le statut "PUBLIE"');

  } catch (error) {
    console.error('❌ Erreur:', error.response?.status, error.response?.data?.message || error.message);
  }
}

diagnoseDepartementsPublies();
