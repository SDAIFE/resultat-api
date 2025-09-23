# 👥 API CRUD Utilisateurs - Documentation Frontend

## 📋 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentification requise
Toutes les routes nécessitent un token JWT dans l'en-tête :
```http
Authorization: Bearer <accessToken>
```

## 🛡️ Rôles et permissions

| Route | SADMIN | ADMIN | USER |
|-------|--------|-------|------|
| Créer utilisateur | ✅ | ✅ | ❌ |
| Lister utilisateurs | ✅ | ✅ | ❌ |
| Voir utilisateur | ✅ | ✅ | ❌ |
| Modifier utilisateur | ✅ | ✅ | ❌ |
| Supprimer utilisateur | ✅ | ❌ | ❌ |
| Assigner départements | ✅ | ✅ | ❌ |
| Profil personnel | ✅ | ✅ | ✅ |
| Modifier profil personnel | ✅ | ✅ | ✅ |

---

## 📝 Routes CRUD Utilisateurs

### 1. **Créer un utilisateur**
```http
POST /api/users
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "email": "nouveau@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "password": "motdepasse123",
  "roleId": "role123",
  "departementCodes": ["01", "02"],
  "isActive": true
}
```

**Réponse :**
```json
{
  "id": "user123",
  "email": "nouveau@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": {
    "id": "role123",
    "code": "USER",
    "name": "Utilisateur"
  },
  "isActive": true,
  "departements": [
    {
      "id": "dept1",
      "codeDepartement": "01",
      "libelleDepartement": "Département 1"
    }
  ],
  "createdAt": "2025-01-22T10:00:00.000Z",
  "updatedAt": "2025-01-22T10:00:00.000Z"
}
```

### 2. **Lister les utilisateurs (avec pagination)**
```http
GET /api/users?page=1&limit=10&search=jean
Authorization: Bearer <accessToken>
```

**Paramètres de requête :**
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `search` (optionnel) : Terme de recherche

**Réponse :**
```json
{
  "users": [
    {
      "id": "user123",
      "email": "jean@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": {
        "id": "role123",
        "code": "USER",
        "name": "Utilisateur"
      },
      "isActive": true,
      "departements": [...],
      "createdAt": "2025-01-22T10:00:00.000Z",
      "updatedAt": "2025-01-22T10:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### 3. **Récupérer un utilisateur par ID**
```http
GET /api/users/{id}
Authorization: Bearer <accessToken>
```

**Réponse :** Même structure que la création

### 4. **Modifier un utilisateur**
```http
PATCH /api/users/{id}
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "firstName": "Jean-Pierre",
  "lastName": "Martin",
  "email": "jean-pierre@example.com",
  "roleId": "role456",
  "departementCodes": ["01", "03"],
  "isActive": false
}
```

**Réponse :** Même structure que la création

### 5. **Supprimer un utilisateur**
```http
DELETE /api/users/{id}
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
{
  "message": "Utilisateur supprimé avec succès"
}
```

### 6. **Assigner des départements à un utilisateur**
```http
PATCH /api/users/{id}/departements
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "departementCodes": ["01", "02", "03"]
}
```

**Réponse :** Même structure que la création

### 7. **Retirer tous les départements d'un utilisateur**
```http
DELETE /api/users/{id}/departements
Authorization: Bearer <accessToken>
```

**Réponse :** Même structure que la création

---

## 👤 Routes de profil personnel

### 8. **Récupérer mon profil**
```http
GET /api/users/profile/me
Authorization: Bearer <accessToken>
```

**Réponse :** Même structure que la création

### 9. **Modifier mon profil**
```http
PATCH /api/users/profile/me
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "firstName": "Mon Nouveau Prénom",
  "lastName": "Mon Nouveau Nom",
  "email": "nouveau@example.com"
}
```

**Note :** Ne peut pas modifier `roleId` ou `departementCodes`

**Réponse :** Même structure que la création

---

## 📋 Routes pour les listes de sélection

### **Liste des départements**
```http
GET /api/departements/list/simple
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
[
  {
    "codeDepartement": "056",
    "libelleDepartement": "ABENGOUROU"
  },
  {
    "codeDepartement": "ABJ",
    "libelleDepartement": "Abidjan"
  }
]
```

### **Liste des CELs**
```http
GET /api/cels/list/simple
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
[
  {
    "codeCellule": "041",
    "libelleCellule": "CESP GBON"
  },
  {
    "codeCellule": "408",
    "libelleCellule": "CESP TIEBISSOU"
  }
]
```

## 🔧 Exemples d'implémentation Frontend

### TypeScript Interfaces
```typescript
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

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId?: string;
  departementCodes?: string[];
  isActive?: boolean;
}
```

### Fonctions utilitaires
```typescript
const API_BASE_URL = 'http://localhost:3001/api';

// Fonction pour obtenir les headers d'authentification
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Créer un utilisateur
async function createUser(userData: CreateUserData): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la création de l\'utilisateur');
  }
  
  return response.json();
}

// Lister les utilisateurs
async function getUsers(page = 1, limit = 10, search = ''): Promise<UserListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });
  
  const response = await fetch(`${API_BASE_URL}/users?${params}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des utilisateurs');
  }
  
  return response.json();
}

// Récupérer un utilisateur
async function getUser(id: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Utilisateur non trouvé');
  }
  
  return response.json();
}

// Modifier un utilisateur
async function updateUser(id: string, userData: Partial<CreateUserData>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la modification de l\'utilisateur');
  }
  
  return response.json();
}

// Supprimer un utilisateur
async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression de l\'utilisateur');
  }
}

// Assigner des départements
async function assignDepartements(id: string, departementCodes: string[]): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${id}/departements`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ departementCodes })
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de l\'assignation des départements');
  }
  
  return response.json();
}

// Récupérer mon profil
async function getMyProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/profile/me`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du profil');
  }
  
  return response.json();
}

// Modifier mon profil
async function updateMyProfile(userData: Partial<CreateUserData>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/profile/me`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la modification du profil');
  }
  
  return response.json();
}
```

---

## ⚠️ Gestion des erreurs

### Codes d'erreur possibles
- **400 Bad Request** : Données invalides
- **401 Unauthorized** : Token manquant ou invalide
- **403 Forbidden** : Permissions insuffisantes
- **404 Not Found** : Utilisateur non trouvé
- **409 Conflict** : Email déjà utilisé

### Exemple de réponse d'erreur
```json
{
  "statusCode": 400,
  "message": ["Email invalide", "Le prénom est requis"],
  "error": "Bad Request"
}
```

---

## 🧪 Tests disponibles

```bash
# Tester l'authentification
npm run test:auth

# Tester tous les endpoints
npm run test:all

# Tester la validation
npm run test:validation
```
