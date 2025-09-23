#!/usr/bin/env ts-node

/**
 * Script de test complet pour la création d'utilisateur avec les listes
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

let accessToken: string;

async function login(): Promise<boolean> {
  console.log('🔐 Connexion...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'anderson.aka@cei.ci',
      password: 'motdepasse123'
    });

    accessToken = response.data.accessToken;
    console.log('✅ Connexion réussie');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return false;
  }
}

async function getFormLists(): Promise<{
  departements: any[];
  cels: any[];
}> {
  console.log('\n📋 Récupération des listes pour les formulaires...');
  
  try {
    const [departementsResponse, celsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/departements/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${API_BASE_URL}/cels/list/simple`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    console.log('✅ Listes récupérées avec succès');
    console.log(`- ${departementsResponse.data.length} départements disponibles`);
    console.log(`- ${celsResponse.data.length} CELs disponibles`);

    return {
      departements: departementsResponse.data,
      cels: celsResponse.data
    };
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des listes:', error.response?.data || error.message);
    throw error;
  }
}

async function createUserWithLists(departements: any[], cels: any[]): Promise<void> {
  console.log('\n👤 Test de création d\'utilisateur avec sélection...');
  
  try {
    // Sélectionner quelques départements et CELs
    const selectedDepartements = departements.slice(0, 2).map(d => d.codeDepartement);
    const selectedCels = cels.slice(0, 3).map(c => c.codeCellule);

    const userData = {
      email: `test.lists.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'With Lists',
      password: 'motdepasse123',
      departementCodes: selectedDepartements,
      isActive: true
    };

    console.log('📝 Données de création:');
    console.log('Email:', userData.email);
    console.log('Départements sélectionnés:', selectedDepartements);
    console.log('CELs sélectionnés:', selectedCels);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Nom:', response.data.firstName, response.data.lastName);
    console.log('Départements assignés:', response.data.departements.length);

    // Nettoyer - supprimer l'utilisateur créé
    console.log('\n🧹 Nettoyage...');
    await axios.delete(`${API_BASE_URL}/users/${response.data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('✅ Utilisateur supprimé');

  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.response?.data || error.message);
  }
}

async function testFormIntegration(): Promise<void> {
  console.log('\n🎨 Test d\'intégration formulaire...');
  
  try {
    const { departements, cels } = await getFormLists();

    // Simuler un formulaire avec recherche
    console.log('\n🔍 Simulation de recherche dans les listes:');
    
    // Recherche dans les départements
    const searchTerm = 'ABI';
    const filteredDepartements = departements.filter(d => 
      d.libelleDepartement.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log(`Départements contenant "${searchTerm}":`, filteredDepartements.length);
    filteredDepartements.slice(0, 3).forEach((dept, index) => {
      console.log(`  ${index + 1}. ${dept.codeDepartement} - ${dept.libelleDepartement}`);
    });

    // Recherche dans les CELs
    const filteredCels = cels.filter(c => 
      c.libelleCellule.toLowerCase().includes('CESP')
    );
    
    console.log(`\nCELs contenant "CESP":`, filteredCels.length);
    filteredCels.slice(0, 3).forEach((cel, index) => {
      console.log(`  ${index + 1}. ${cel.codeCellule} - ${cel.libelleCellule}`);
    });

    console.log('\n✅ Simulation d\'intégration formulaire réussie');

  } catch (error: any) {
    console.error('❌ Erreur lors du test d\'intégration:', error.response?.data || error.message);
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test complet de création d\'utilisateur avec listes\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(70));

  // Connexion
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  try {
    // Récupérer les listes
    const { departements, cels } = await getFormLists();

    // Tester la création d'utilisateur
    await createUserWithLists(departements, cels);

    // Tester l'intégration formulaire
    await testFormIntegration();

    console.log('\n🎉 Tests complets terminés !');
    console.log('\n💡 Les listes sont prêtes pour l\'intégration frontend');

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
