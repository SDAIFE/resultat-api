# Documentation Technique - Système d'Authentification API

## Vue d'ensemble

Cette documentation présente l'architecture complète du système d'authentification implémenté dans une API NestJS utilisant Prisma ORM et PostgreSQL. Le système offre une authentification robuste avec gestion des rôles, sessions, et fonctionnalités avancées de sécurité.

## Architecture Générale

### Stack Technologique
- **Framework** : NestJS (Node.js)
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : JWT (JSON Web Tokens) avec Passport.js
- **Hachage des mots de passe** : bcryptjs
- **Service email** : SendGrid
- **Validation** : class-validator

### Composants Principaux
1. **AuthModule** : Module principal d'authentification
2. **AuthService** : Logique métier de l'authentification
3. **AuthController** : Endpoints REST pour l'authentification
4. **JwtStrategy** : Stratégie Passport pour la validation des tokens JWT
5. **Guards** : Mécanismes de protection des routes
6. **DTOs** : Validation des données d'entrée

## Modèle de Données

### Entité User
```typescript
model User {
  id                      String                   @id @default(cuid())
  email                   String                   @unique
  password                String
  nom                     String?
  prenom                  String?
  role                    UserRole                 @default(ORGANISME)
  isActive                Boolean                  @default(true)
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
  RefreshToken            RefreshToken[]
  Session                 Session[]
  EmailVerification       EmailVerification[]
  PasswordResetToken      PasswordResetToken[]
}
```

### Rôles Utilisateur
```typescript
enum UserRole {
  ADMIN
  MANAGER
  ORGANISME
}
```

### Entités de Sécurité
- **Session** : Gestion des sessions utilisateur
- **RefreshToken** : Tokens de rafraîchissement sécurisés
- **EmailVerification** : Codes de vérification email
- **PasswordResetToken** : Tokens de réinitialisation de mot de passe

## Configuration JWT

### Paramètres de Sécurité
```typescript
{
  secret: process.env.JWT_SECRET, // Minimum 32 caractères
  signOptions: {
    expiresIn: '24h',
    issuer: 'accreditation-api',
    audience: 'accreditation-client'
  }
}
```

### Validation des Variables d'Environnement
- Vérification de l'existence de `JWT_SECRET`
- Validation de la longueur minimale (32 caractères)
- Configuration automatique des options de signature

## Fonctionnalités d'Authentification

### 1. Inscription (Register)

#### Inscription Simple
```typescript
POST /auth/register
{
  "email": "user@example.com",
  "password": "motdepasse123",
  "nom": "Dupont",
  "prenom": "Jean",
  "role": "ORGANISME"
}
```

#### Inscription Structure
```typescript
POST /auth/register-structure
{
  "email": "structure@example.com",
  "password": "motdepasse123",
  "nomStructure": "Mon Organisation",
  "typeDemande": "SENSIBILISATION",
  "typeStructure": "Association"
}
```

**Processus d'inscription** :
1. Validation des données d'entrée
2. Vérification de l'unicité de l'email
3. Hachage du mot de passe avec bcryptjs (salt rounds: 10)
4. Création de l'utilisateur (statut inactif par défaut)
5. Génération et envoi d'un code de vérification à 6 chiffres
6. Retour du token JWT pour l'onboarding

### 2. Vérification Email

#### Génération du Code
- Code numérique à 6 chiffres
- Durée de validité : 15 minutes
- Stockage sécurisé en base de données

#### Processus de Vérification
```typescript
POST /auth/verify-email
{
  "email": "user@example.com",
  "code": "123456"
}
```

### 3. Connexion (Login)

```typescript
POST /auth/login
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Processus de connexion** :
1. Validation des identifiants
2. Vérification du statut actif du compte
3. Création d'une session avec tracking IP/User-Agent
4. Génération du refresh token sécurisé
5. Retour du token JWT et des informations utilisateur

#### Gestion des Comptes Inactifs
- Renvoi automatique du code de vérification
- Message explicite avec code d'erreur `ACCOUNT_NOT_ACTIVATED`

### 4. Gestion des Sessions

#### Création de Session
```typescript
const session = await this.prisma.session.create({
  data: {
    userId: user.id,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  }
});
```

#### Refresh Tokens
- Génération cryptographiquement sécurisée (64 bytes)
- Durée de validité : 7 jours
- Rotation automatique lors du rafraîchissement
- Révocation en cascade lors du changement de mot de passe

## Système de Guards

### 1. JwtAuthGuard
Protection des routes nécessitant une authentification :
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: any) {
  return this.authService.getProfile(user.id);
}
```

### 2. RolesGuard
Contrôle d'accès basé sur les rôles :
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Get('users')
async getAllUsers(@Query() query: ListUsersQueryDto) {
  return this.authService.getAllUsers(query);
}
```

### 3. SubmissionDeadlineGuard
Guard métier spécifique pour contrôler l'accès selon les dates limites de soumission :
- Vérification des dates limites par type de demande
- Blocage automatique après expiration
- Gestion différenciée selon l'état du dossier

## Stratégie JWT

### Validation des Tokens
```typescript
async validate(payload: any) {
  const user = await this.authService.validateUser(payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedException('Token invalide ou utilisateur inactif');
  }
  
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}
```

### Configuration de la Stratégie
- Extraction depuis l'en-tête Authorization Bearer
- Validation de l'issuer et audience
- Vérification de l'expiration automatique

## Gestion des Mots de Passe

### Réinitialisation
1. **Demande de réinitialisation** : `POST /auth/forgot-password`
2. **Génération d'un token sécurisé** (48 bytes)
3. **Envoi d'email avec lien de réinitialisation**
4. **Validation et mise à jour** : `POST /auth/reset-password`

### Changement de Mot de Passe
```typescript
POST /auth/change-password
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

**Sécurité** :
- Vérification du mot de passe actuel
- Validation de la différence entre ancien/nouveau
- Révocation de tous les refresh tokens actifs

## Service Email

### Configuration
- **Provider** : SendGrid
- **Simulation** : Mode développement avec `EMAIL_SIMULATION=true`
- **Templates** : HTML responsive avec design moderne

### Types d'Emails
1. **Vérification de compte** : Code à 6 chiffres
2. **Réinitialisation de mot de passe** : Lien sécurisé
3. **Notification de connexion** : Alerte de sécurité

### Template Email
- Design responsive et moderne
- Branding cohérent
- Informations de sécurité (expiration, etc.)
- Gestion des erreurs non-bloquante

## Sécurité

### Bonnes Pratiques Implémentées
1. **Hachage sécurisé** : bcryptjs avec salt rounds appropriés
2. **JWT sécurisé** : Secret fort, issuer/audience validation
3. **Rotation des tokens** : Refresh token rotation
4. **Limitation temporelle** : Expiration des codes/tokens
5. **Validation stricte** : DTOs avec class-validator
6. **Logging sécurisé** : Pas d'exposition des mots de passe

### Protection CSRF/XSS
- Cookies httpOnly pour les refresh tokens
- Validation stricte des entrées
- Sanitisation des données

## Endpoints API

### Authentification de Base
- `POST /auth/register` - Inscription utilisateur
- `POST /auth/register-structure` - Inscription structure
- `POST /auth/login` - Connexion
- `POST /auth/logout` - Déconnexion

### Gestion de Compte
- `GET /auth/profile` - Profil utilisateur
- `PUT /auth/profile` - Mise à jour profil
- `POST /auth/verify-email` - Vérification email
- `POST /auth/resend-verification` - Renvoi code

### Mots de Passe
- `POST /auth/forgot-password` - Demande réinitialisation
- `POST /auth/reset-password` - Réinitialisation
- `PUT /auth/change-password` - Changement (connecté)

### Administration
- `GET /auth/users` - Liste utilisateurs (Admin/Manager)
- `PUT /auth/users/:id` - Modification utilisateur (Admin/Manager)
- `POST /auth/check-account-status` - Vérification statut compte

### Tokens
- `POST /auth/refresh` - Rafraîchissement token

## Configuration Environnement

### Variables Requises
```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/db"

# JWT
JWT_SECRET="your-super-secure-jwt-secret-minimum-32-chars"

# Email
SENDGRID_API_KEY="your-sendgrid-api-key"
EMAIL_SIMULATION="false"

# Application
CORS_ORIGIN="http://localhost:3000"

# Dates limites (optionnel)
DATE_LIMIT_DOS="2025-09-10"
DATE_LIMIT_DOS_OBS="2025-09-20"
```

## Gestion d'Erreurs

### Codes d'Erreur Spécifiques
- `ACCOUNT_NOT_ACTIVATED` : Compte non vérifié
- `UnauthorizedException` : Identifiants invalides
- `ConflictException` : Email déjà utilisé
- `ForbiddenException` : Date limite dépassée

### Logging
- Événements d'authentification tracés
- Erreurs d'envoi email non-bloquantes
- Tentatives de connexion invalides

## Déploiement et Monitoring

### Recommandations
1. **Variables d'environnement** sécurisées
2. **Monitoring** des tentatives de connexion
3. **Backup** des sessions et tokens
4. **Rate limiting** sur les endpoints sensibles
5. **HTTPS** obligatoire en production

## Extensions Possibles

### Fonctionnalités Avancées
1. **Authentification multi-facteur (2FA)**
2. **OAuth2/Social Login**
3. **Limitation de tentatives de connexion**
4. **Audit trail complet**
5. **Gestion avancée des permissions**

Cette architecture d'authentification offre une base solide et sécurisée pour une application NestJS, avec une séparation claire des responsabilités et une extensibilité pour des fonctionnalités futures.
