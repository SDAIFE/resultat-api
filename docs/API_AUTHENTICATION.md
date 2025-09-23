# 🔐 Documentation API d'Authentification

## 📋 Structure de l'API

### Base URL
```
http://localhost:3001/api
```

## 🔑 Endpoints d'Authentification

### 1. Connexion (Login)
```http
POST /api/auth/login
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "email": "anderson.aka@cei.ci",
  "password": "motdepasse123"
}
```

**Réponse attendue :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "user": {
    "id": "clx1234567890",
    "email": "anderson.aka@cei.ci",
    "firstName": "Anderson",
    "lastName": "Aka",
    "role": {
      "code": "USER"
    },
    "departements": [
      {
        "codeDepartement": "01"
      },
      {
        "codeDepartement": "02"
      }
    ],
    "isActive": true
  }
}
```

### 2. Inscription (Register)
```http
POST /api/auth/register
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "email": "nouveau@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "password": "motdepasse123",
  "roleId": "USER"
}
```

### 3. Rafraîchir le token
```http
POST /api/auth/refresh
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```

**Réponse :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. Déconnexion
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Données à envoyer :**
```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```

### 5. Profil utilisateur
```http
GET /api/auth/profile
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
{
  "id": "clx1234567890",
  "email": "anderson.aka@cei.ci",
  "firstName": "Anderson",
  "lastName": "Aka",
  "role": {
    "code": "USER"
  },
  "departements": [
    {
      "codeDepartement": "01"
    }
  ],
  "isActive": true
}
```

### 6. Vérifier le token
```http
GET /api/auth/verify
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
{
  "valid": true,
  "message": "Token valide"
}
```

## 🧪 Test de l'API

### Script de test automatique
```bash
npm run test:auth
```

### Test manuel avec curl
```bash
# Test de connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "anderson.aka@cei.ci",
    "password": "motdepasse123"
  }'

# Test du profil (remplacez YOUR_TOKEN par le vrai token)
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Configuration Frontend

### Exemple d'implémentation JavaScript/TypeScript

```typescript
// Interface TypeScript
interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      code: string;
    };
    departements: {
      codeDepartement: string;
    }[];
    isActive: boolean;
  };
}

// Fonction de connexion
async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur de connexion');
  }

  return response.json();
}

// Fonction pour les requêtes authentifiées
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
```

## ⚠️ Gestion des erreurs

### Codes d'erreur possibles
- **400 Bad Request** : Données invalides
- **401 Unauthorized** : Identifiants incorrects ou token invalide
- **500 Internal Server Error** : Erreur serveur

### Exemple de réponse d'erreur
```json
{
  "statusCode": 401,
  "message": "Identifiants invalides",
  "error": "Unauthorized"
}
```

## 🔒 Sécurité

### Tokens JWT
- **Access Token** : Durée de vie courte (15 minutes par défaut)
- **Refresh Token** : Durée de vie longue (7 jours par défaut)
- **Stockage** : Recommandé dans localStorage ou sessionStorage

### Validation
- **Email** : Format email valide
- **Mot de passe** : Minimum 6 caractères
- **Rate Limiting** : Protection contre les attaques par force brute

## 📊 Monitoring

### Endpoints de monitoring
```http
GET /api/monitoring/stats    # Statistiques des requêtes
GET /api/monitoring/report   # Rapport de performance
GET /api/monitoring/reset    # Réinitialiser les métriques
```

### Exemple de réponse des statistiques
```json
{
  "totalQueries": 150,
  "slowQueries": [
    {
      "query": "SELECT * FROM users WHERE email = ?",
      "count": 5,
      "averageTime": 1200.5,
      "lastExecuted": "2025-01-22T17:30:00.000Z"
    }
  ],
  "mostFrequent": [...],
  "averageExecutionTime": 45.2
}
```
