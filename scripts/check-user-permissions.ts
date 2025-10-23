import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/v1';

// Identifiants de test
const TEST_CREDENTIALS = {
  email: 'anderson.aka@cei.ci',
  password: 'adminDtic@2025!'
};

async function checkUserPermissions() {
  try {
    console.log('🔐 Authentification...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password
    });

    const token = loginResponse.data.accessToken || loginResponse.data.token;
    console.log('✅ Authentification réussie !');
    console.log('🔑 Token:', token ? 'Oui' : 'Non');

    // Vérifier les informations de l'utilisateur
    console.log('\n👤 Vérification des informations utilisateur...');
    
    try {
      const userResponse = await axios.get(`${BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Profil utilisateur récupéré:');
      console.log('  • Email:', userResponse.data.email);
      console.log('  • Nom:', userResponse.data.firstName, userResponse.data.lastName);
      console.log('  • Rôle:', userResponse.data.roleId);
      console.log('  • Actif:', userResponse.data.isActive);

    } catch (error) {
      console.log('❌ Erreur profil:', error.response?.status, error.response?.data?.message);
    }

    // Tester différents endpoints pour voir les permissions
    console.log('\n🔍 Test des permissions sur différents endpoints...');
    
    const endpoints = [
      { name: 'Header Results', url: '/elections/election-2025/results/header' },
      { name: 'Full Results', url: '/elections/election-2025/results' },
      { name: 'Candidates', url: '/elections/election-2025/results/candidates' },
      { name: 'Summary', url: '/elections/election-2025/results/summary' },
      { name: 'Users List', url: '/users' },
      { name: 'Departments', url: '/departements' },
      { name: 'Regions', url: '/regions' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ ${endpoint.name}: ${response.status} - Accès autorisé`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.response?.status} - ${error.response?.data?.message || 'Erreur'}`);
      }
    }

    // Vérifier les rôles disponibles
    console.log('\n📋 Vérification des rôles disponibles...');
    try {
      const rolesResponse = await axios.get(`${BASE_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Rôles disponibles:');
      rolesResponse.data.forEach((role: any) => {
        console.log(`  • ${role.code}: ${role.name} (${role.isActive ? 'Actif' : 'Inactif'})`);
      });

    } catch (error) {
      console.log('❌ Erreur rôles:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.response?.data || error.message);
  }
}

// Exécution
checkUserPermissions();
