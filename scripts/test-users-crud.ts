#!/usr/bin/env ts-node

/**
 * Script de test pour le CRUD des utilisateurs
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  isActive: boolean;
  departements: {
    id: string;
    codeDepartement: string;
    libelleDepartement: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

let accessToken: string;
let createdUserId: string;

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

async function testCreateUser(): Promise<void> {
  console.log('\n📝 Test de création d\'utilisateur...');
  
  try {
    const userData = {
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'motdepasse123',
      isActive: true
    };

    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    createdUserId = response.data.id;
    console.log('✅ Utilisateur créé avec succès');
    console.log('ID:', createdUserId);
    console.log('Email:', response.data.email);
    console.log('Nom:', response.data.firstName, response.data.lastName);
  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.response?.data || error.message);
  }
}

async function testGetUsers(): Promise<void> {
  console.log('\n📋 Test de récupération des utilisateurs...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/users?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data: UserListResponse = response.data;
    console.log('✅ Utilisateurs récupérés avec succès');
    console.log('Total:', data.total);
    console.log('Page:', data.page);
    console.log('Limite:', data.limit);
    console.log('Pages totales:', data.totalPages);
    console.log('Utilisateurs trouvés:', data.users.length);
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération:', error.response?.data || error.message);
  }
}

async function testGetUser(): Promise<void> {
  if (!createdUserId) {
    console.log('\n⚠️  Pas d\'utilisateur créé, test ignoré');
    return;
  }

  console.log('\n👤 Test de récupération d\'un utilisateur...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/users/${createdUserId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const user: User = response.data;
    console.log('✅ Utilisateur récupéré avec succès');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Nom:', user.firstName, user.lastName);
    console.log('Rôle:', user.role.code);
    console.log('Actif:', user.isActive);
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération:', error.response?.data || error.message);
  }
}

async function testUpdateUser(): Promise<void> {
  if (!createdUserId) {
    console.log('\n⚠️  Pas d\'utilisateur créé, test ignoré');
    return;
  }

  console.log('\n✏️  Test de modification d\'utilisateur...');
  
  try {
    const updateData = {
      firstName: 'Test Updated',
      lastName: 'User Modified',
      isActive: false
    };

    const response = await axios.patch(`${API_BASE_URL}/users/${createdUserId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Utilisateur modifié avec succès');
    console.log('Nouveau nom:', response.data.firstName, response.data.lastName);
    console.log('Actif:', response.data.isActive);
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification:', error.response?.data || error.message);
  }
}

async function testAssignDepartements(): Promise<void> {
  if (!createdUserId) {
    console.log('\n⚠️  Pas d\'utilisateur créé, test ignoré');
    return;
  }

  console.log('\n🏢 Test d\'assignation de départements...');
  
  try {
    const departementData = {
      departementCodes: ['01', '02']
    };

    const response = await axios.patch(`${API_BASE_URL}/users/${createdUserId}/departements`, departementData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Départements assignés avec succès');
    console.log('Départements:', response.data.departements.map((d: any) => d.codeDepartement));
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'assignation:', error.response?.data || error.message);
  }
}

async function testGetMyProfile(): Promise<void> {
  console.log('\n👤 Test de récupération de mon profil...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/users/profile/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const user: User = response.data;
    console.log('✅ Profil récupéré avec succès');
    console.log('Email:', user.email);
    console.log('Nom:', user.firstName, user.lastName);
    console.log('Rôle:', user.role.code);
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération du profil:', error.response?.data || error.message);
  }
}

async function testUpdateMyProfile(): Promise<void> {
  console.log('\n✏️  Test de modification de mon profil...');
  
  try {
    const updateData = {
      firstName: 'Anderson Updated',
      lastName: 'Aka Modified'
    };

    const response = await axios.patch(`${API_BASE_URL}/users/profile/me`, updateData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Profil modifié avec succès');
    console.log('Nouveau nom:', response.data.firstName, response.data.lastName);
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification du profil:', error.response?.data || error.message);
  }
}

async function testDeleteUser(): Promise<void> {
  if (!createdUserId) {
    console.log('\n⚠️  Pas d\'utilisateur créé, test ignoré');
    return;
  }

  console.log('\n🗑️  Test de suppression d\'utilisateur...');
  
  try {
    const response = await axios.delete(`${API_BASE_URL}/users/${createdUserId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Utilisateur supprimé avec succès');
    console.log('Message:', response.data.message);
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression:', error.response?.data || error.message);
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test du CRUD des utilisateurs\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('=' .repeat(50));

  // Connexion
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion');
    return;
  }

  // Tests CRUD
  await testCreateUser();
  await testGetUsers();
  await testGetUser();
  await testUpdateUser();
  await testAssignDepartements();
  await testGetMyProfile();
  await testUpdateMyProfile();
  await testDeleteUser();

  console.log('\n🎉 Tests du CRUD terminés !');
}

if (require.main === module) {
  main().catch(console.error);
}
