# 📋 Résumé des Routes API - Frontend

## 🔗 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentification
Toutes les routes nécessitent un token JWT :
```http
Authorization: Bearer <accessToken>
```

---

## 🔑 Authentification (`/api/auth`)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| `POST` | `/auth/login` | Connexion | Public |
| `POST` | `/auth/register` | Inscription | Public |
| `POST` | `/auth/refresh` | Rafraîchir token | Public |
| `POST` | `/auth/logout` | Déconnexion | Authentifié |
| `GET` | `/auth/profile` | Mon profil | Authentifié |
| `GET` | `/auth/verify` | Vérifier token | Authentifié |

---

## 👥 Gestion des Utilisateurs (`/api/users`)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| `POST` | `/users` | Créer utilisateur | SADMIN, ADMIN |
| `GET` | `/users` | Lister utilisateurs | SADMIN, ADMIN |
| `GET` | `/users/{id}` | Voir utilisateur | SADMIN, ADMIN |
| `PATCH` | `/users/{id}` | Modifier utilisateur | SADMIN, ADMIN |
| `DELETE` | `/users/{id}` | Supprimer utilisateur | SADMIN |
| `PATCH` | `/users/{id}/departements` | Assigner départements | SADMIN, ADMIN |
| `DELETE` | `/users/{id}/departements` | Retirer départements | SADMIN, ADMIN |
| `GET` | `/users/profile/me` | Mon profil | Tous |
| `PATCH` | `/users/profile/me` | Modifier mon profil | Tous |

---

## 🏢 Départements (`/api/departements`)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| `GET` | `/departements` | Lister départements | SADMIN, ADMIN, USER |
| `GET` | `/departements/{code}` | Voir département | SADMIN, ADMIN, USER |
| `PATCH` | `/departements/{code}` | Modifier département | SADMIN, ADMIN |
| `PATCH` | `/departements/{code}/assign-user` | Assigner utilisateur | SADMIN, ADMIN |
| `PATCH` | `/departements/{code}/unassign-user` | Retirer utilisateur | SADMIN, ADMIN |
| `GET` | `/departements/stats/overview` | Statistiques | SADMIN, ADMIN |
| `GET` | `/departements/region/{code}` | Par région | SADMIN, ADMIN, USER |
| `GET` | `/departements/list/simple` | **Liste simple** | SADMIN, ADMIN, USER |

---

## 🏛️ CELs (`/api/cels`)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| `GET` | `/cels` | Lister CELs | SADMIN, ADMIN, USER |
| `GET` | `/cels/{code}` | Voir CEL | SADMIN, ADMIN, USER |
| `PATCH` | `/cels/{code}` | Modifier CEL | SADMIN, ADMIN |
| `PATCH` | `/cels/{code}/assign-user` | Assigner utilisateur | SADMIN, ADMIN |
| `PATCH` | `/cels/{code}/unassign-user` | Retirer utilisateur | SADMIN, ADMIN |
| `GET` | `/cels/stats/overview` | Statistiques | SADMIN, ADMIN |
| `GET` | `/cels/departement/{code}` | Par département | SADMIN, ADMIN, USER |
| `GET` | `/cels/region/{code}` | Par région | SADMIN, ADMIN, USER |
| `GET` | `/cels/unassigned/list` | Sans utilisateur | SADMIN, ADMIN |
| `GET` | `/cels/type/{type}` | Par type | SADMIN, ADMIN, USER |
| `GET` | `/cels/list/simple` | **Liste simple** | SADMIN, ADMIN, USER |

---

## 📊 Monitoring (`/api/monitoring`)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| `GET` | `/monitoring/stats` | Statistiques requêtes | Authentifié |
| `GET` | `/monitoring/report` | Rapport performance | Authentifié |
| `GET` | `/monitoring/reset` | Réinitialiser métriques | Authentifié |

---

## 🎯 Routes Spéciales pour Formulaires

### **Liste des départements (pour formulaires)**
```http
GET /api/departements/list/simple
```
**Réponse :** `[{ codeDepartement, libelleDepartement }]`

### **Liste des CELs (pour formulaires)**
```http
GET /api/cels/list/simple
```
**Réponse :** `[{ codeCellule, libelleCellule }]`

---

## 🧪 Scripts de Test Disponibles

```bash
# Tests d'authentification
npm run test:auth

# Tests de validation
npm run test:validation

# Tests CRUD utilisateurs
npm run test:users

# Tests des listes
npm run test:lists

# Test complet création utilisateur
npm run test:user-creation

# Tests de tous les endpoints
npm run test:all

# Tests de déconnexion
npm run test:logout
```

---

## 📚 Documentation Complète

- **Authentification** : `API_AUTHENTICATION.md`
- **CRUD Utilisateurs** : `API_USERS_CRUD.md`
- **Listes pour Formulaires** : `API_LISTS_FORMS.md`
- **Corrections** : `FIX_VALIDATION_ERRORS.md`
- **Changelog** : `CHANGELOG_API_PREFIX.md`

---

## 🔧 Configuration Frontend

### Headers requis
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
};
```

### Gestion des erreurs
- **400** : Données invalides
- **401** : Non authentifié
- **403** : Permissions insuffisantes
- **404** : Ressource non trouvée
- **409** : Conflit (ex: email existant)

### Exemple d'utilisation
```typescript
// Récupérer les listes pour un formulaire
const { departements, cels } = await Promise.all([
  fetch('/api/departements/list/simple', { headers }).then(r => r.json()),
  fetch('/api/cels/list/simple', { headers }).then(r => r.json())
]);

// Créer un utilisateur
const user = await fetch('/api/users', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'password123',
    departementCodes: ['056', 'ABJ']
  })
}).then(r => r.json());
```

Votre API est maintenant complète et prête pour l'intégration frontend ! 🚀
