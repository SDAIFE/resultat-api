#!/usr/bin/env ts-node

/**
 * Script de test pour les rôles
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
    console.error('Détails de l\'erreur:', error);
    return false;
  }
}

async function testRolesList(): Promise<void> {
  console.log('\n👥 Test de la liste des rôles...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/roles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Liste des rôles récupérée avec succès');
    console.log('Nombre de rôles:', response.data.length);
    console.log('\n📋 Rôles disponibles:');
    
    response.data.forEach((role: any, index: number) => {
      console.log(`${index + 1}. ${role.code} - ${role.name}`);
      if (role.description) {
        console.log(`   Description: ${role.description}`);
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des rôles:', error.response?.data || error.message);
  }
}

async function testRolesSimpleList(): Promise<void> {
  console.log('\n📋 Test de la liste simple des rôles...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/roles/list/simple`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Liste simple des rôles récupérée avec succès');
    console.log('Nombre de rôles:', response.data.length);
    console.log('\n📋 Rôles pour formulaires:');
    
    response.data.forEach((role: any, index: number) => {
      console.log(`${index + 1}. ${role.code} - ${role.name} (ID: ${role.id})`);
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération de la liste simple:', error.response?.data || error.message);
  }
}

async function testCreateUserWithRole(): Promise<void> {
  console.log('\n👤 Test de création d\'utilisateur avec rôle...');
  
  try {
    // Récupérer la liste des rôles
    const rolesResponse = await axios.get(`${API_BASE_URL}/roles/list/simple`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const roles = rolesResponse.data;
    console.log('✅ Rôles récupérés:', roles.length);

    // Sélectionner le premier rôle (généralement USER)
    const selectedRole = roles.find((r: any) => r.code === 'USER') || roles[0];
    console.log('Rôle sélectionné:', selectedRole.code, '-', selectedRole.name);

    // Créer un utilisateur avec ce rôle
    const userData = {
      email: `test.role.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'With Role',
      password: 'motdepasse123',
      roleId: selectedRole.id,
      isActive: true
    };

    console.log('📝 Données de création:');
    console.log('Email:', userData.email);
    console.log('Rôle ID:', userData.roleId);

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Rôle:', response.data.role.code, '-', response.data.role.name);

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

async function main(): Promise<void> {
  console.log('🧪 Test des rôles\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(50));

  // Connexion
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  // Tests
  await testRolesList();
  await testRolesSimpleList();
  await testCreateUserWithRole();

  console.log('\n🎉 Tests des rôles terminés !');
}

if (require.main === module) {
  main().catch(console.error);
}
