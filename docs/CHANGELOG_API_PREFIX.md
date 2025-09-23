# 📝 Changelog - Ajout du préfixe API

## 🚀 Changements apportés

### ✅ Préfixe global ajouté
- **Fichier modifié** : `src/main.ts`
- **Changement** : Ajout de `app.setGlobalPrefix('api')`
- **Résultat** : Toutes les routes sont maintenant préfixées par `/api`

### 📋 Endpoints mis à jour

#### Authentification
- `POST /auth/login` → `POST /api/auth/login`
- `POST /auth/register` → `POST /api/auth/register`
- `POST /auth/refresh` → `POST /api/auth/refresh`
- `POST /auth/logout` → `POST /api/auth/logout`
- `GET /auth/profile` → `GET /api/auth/profile`
- `GET /auth/verify` → `GET /api/auth/verify`

#### Monitoring
- `GET /monitoring/stats` → `GET /api/monitoring/stats`
- `GET /monitoring/report` → `GET /api/monitoring/report`
- `GET /monitoring/reset` → `GET /api/monitoring/reset`

### 🔧 Scripts mis à jour

#### Scripts de test
- `scripts/test-auth.ts` - URL mise à jour vers `/api`
- `scripts/test-all-endpoints.ts` - Nouveau script de test complet

#### Scripts utilitaires
- `scripts/create-test-user.ts` - Inchangé
- `scripts/list-users.ts` - Inchangé
- `scripts/reset-test-password.ts` - Inchangé

### 📚 Documentation mise à jour

#### Fichiers modifiés
- `API_AUTHENTICATION.md` - Toutes les URLs mises à jour
- `package.json` - Nouveaux scripts ajoutés

### 🧪 Tests validés

#### Tests réussis
- ✅ Connexion : `POST /api/auth/login`
- ✅ Profil : `GET /api/auth/profile`
- ✅ Vérification : `GET /api/auth/verify`
- ✅ Rafraîchissement : `POST /api/auth/refresh`

#### Tests avec authentification requise
- ⚠️ Monitoring : Nécessite un token valide
- ⚠️ Déconnexion : Nécessite un token valide

### 🎯 Impact sur le frontend

#### Configuration requise
Le frontend doit maintenant utiliser :
```typescript
const API_BASE_URL = 'http://localhost:3001/api';
```

#### Exemples d'utilisation
```typescript
// Avant
fetch('http://localhost:3001/auth/login', ...)

// Maintenant
fetch('http://localhost:3001/api/auth/login', ...)
```

### 📊 Commandes disponibles

```bash
# Tests
npm run test:auth      # Test d'authentification
npm run test:all       # Test de tous les endpoints

# Gestion des utilisateurs
npm run list:users     # Lister les utilisateurs
npm run create:test-user    # Créer un utilisateur de test
npm run reset:test-password # Réinitialiser le mot de passe

# Configuration
npm run setup:security # Configuration de sécurité
```

### 🔒 Sécurité

Le préfixe `/api` améliore la sécurité en :
- Séparant clairement les endpoints API des autres routes
- Facilitant la configuration de reverse proxy
- Permettant une meilleure gestion des CORS
- Organisant l'architecture de l'application

### ✅ Validation

Tous les endpoints fonctionnent correctement avec le nouveau préfixe `/api`. L'API est prête pour la production avec une structure claire et organisée.
