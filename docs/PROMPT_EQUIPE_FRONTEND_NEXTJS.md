# Prompt pour l'Équipe Frontend - Migration Next.js

## Mission
Vous êtes chargés de développer l'interface frontend d'une application de transmission des résultats électoraux en utilisant **Next.js 14+ avec TypeScript**. Cette application remplace un système ASP.NET MVC existant utilisé pour l'élection présidentielle de 2020 en Côte d'Ivoire.

## Contexte métier
L'application permet aux agents de la Commission Électorale Indépendante (CEI) de :
- Importer des fichiers Excel contenant les résultats par bureau de vote
- Valider et publier les résultats par département
- Suivre en temps réel l'état de traitement des données
- Générer des rapports et statistiques

## Note importante sur l'authentification

**ATTENTION :** Cette nouvelle application n'utilise PAS les tables système ASP.NET Identity de l'ancien projet. Nous implémentons une authentification moderne avec :

- **Modèle User personnalisé** (id, email, firstName, lastName, role)
- **NextAuth.js v5** pour la gestion des sessions
- **JWT tokens** avec refresh automatique
- **Pas de dépendance** aux anciennes tables utilisateur

## Spécifications techniques

### Stack technologique requise
- **Framework :** Next.js 14+ (App Router)
- **Langage :** TypeScript strict
- **Styling :** Tailwind CSS + Shadcn/ui
- **État global :** Zustand
- **Formulaires :** Zod
- **Authentification :** NextAuth.js v5 avec proxy vers l'API NestJS
- **HTTP Client :** TanStack Query (React Query) + Axios
- **Upload de fichiers :** react-dropzone
- **Tableaux :** TanStack Table
- **Graphiques :** Chart.js ou Recharts
- **Notifications :** react-hot-toast
- **Icons :** Lucide React

### Architecture des pages

#### 1. Pages d'authentification
```
/login - Connexion utilisateur
/register - Inscription (admin uniquement)
```

#### 2. Dashboard principal
```
/dashboard - Vue d'ensemble avec statistiques adaptées au rôle
  - USER : Mes CELs assignées, progression personnelle, alertes
  - ADMIN : Départements assignés, CELs des départements, utilisateurs actifs
  - SADMIN : Vue globale, statistiques par région, tous les départements, utilisateurs par rôle
  - Graphiques de progression par région/département selon le rôle
  - Alertes contextuelles (CELs sans import, en erreur, en attente)
  - Historique des imports récents
```

#### 3. Gestion des CELs
```
/cels - Liste des CELs avec filtrage avancé
  - Filtres : région, département, type, statut d'assignation
  - Recherche par nom/libellé
  - Pagination
  - Actions : Assigner utilisateur, Voir détails
/cels/[codeCellule] - Détails d'une CEL spécifique
/cels/[codeCellule]/import - Interface d'import Excel pour une CEL
/cels/stats - Statistiques détaillées des CELs
```

#### 4. Gestion des Départements
```
/departements - Liste des départements
  - Filtres : région, statut d'assignation
  - Recherche par nom/libellé
  - Pagination
  - Actions : Assigner utilisateur, Voir détails
/departements/[codeDepartement] - Détails d'un département
/departements/stats - Statistiques des départements
```

#### 5. Gestion des Utilisateurs (Admin/SuperAdmin)
```
/users - Liste des utilisateurs
  - Recherche par nom/email
  - Pagination
  - Actions : Créer, Modifier, Assigner départements
/users/[id] - Détails d'un utilisateur
/users/[id]/departements - Gestion des départements assignés
```

#### 6. Upload et Imports Excel
```
/upload - Interface d'upload de fichiers Excel
  - Zone de drag & drop
  - Validation et prévisualisation
  - Historique des imports
/upload/imports - Historique des imports avec filtres
/upload/stats - Statistiques des imports
```

#### 7. Rapports et statistiques
```
/rapports - Génération de rapports
  - Rapports par département/région
  - Statistiques d'imports
  - Export des données
```

## Interfaces utilisateur à développer

### 1. Layout principal
- Header avec logo CEI et informations utilisateur
- Navigation latérale avec menu contextuel selon le rôle
- Couleurs officielles : Orange #DB812E, blanc, gris
- Design responsive (mobile-first)

### 2. Dashboard interactif
```typescript
// Interface de base pour les statistiques dashboard
interface DashboardStatsDto {
  totalCels: number;
  celsAvecImport: number;
  celsSansImport: number;
  tauxProgression: number;
  celsParStatut: {
    pending: number;
    imported: number;
    error: number;
    processing: number;
  };
  dernierImport?: Date;
  nombreErreurs: number;
  alertes: {
    celsSansImport: number;
    celsEnErreur: number;
    celsEnAttente: number;
  };
}

// Dashboard pour utilisateur USER
interface UserDashboardStatsDto extends DashboardStatsDto {
  celsAssignees: number;
  celsAvecImportAssignees: number;
  celsSansImportAssignees: number;
  tauxProgressionPersonnel: number;
}

// Dashboard pour administrateur ADMIN
interface AdminDashboardStatsDto extends DashboardStatsDto {
  departementsAssignes: number;
  utilisateursActifs: number;
  celsParDepartement: Array<{
    codeDepartement: string;
    libelleDepartement: string;
    totalCels: number;
    celsAvecImport: number;
    tauxProgression: number;
  }>;
}

// Dashboard pour super administrateur SADMIN
interface SadminDashboardStatsDto extends DashboardStatsDto {
  totalRegions: number;
  totalDepartements: number;
  totalUtilisateurs: number;
  celsParRegion: Array<{
    codeRegion: string;
    libelleRegion: string;
    totalCels: number;
    celsAvecImport: number;
    tauxProgression: number;
  }>;
  celsParDepartement: Array<{
    codeDepartement: string;
    libelleDepartement: string;
    codeRegion: string;
    totalCels: number;
    celsAvecImport: number;
    tauxProgression: number;
  }>;
  utilisateursParRole: Array<{
    role: string;
    count: number;
  }>;
  importsParJour: Array<{
    date: string;
    nombreImports: number;
    nombreReussis: number;
    nombreEchoues: number;
  }>;
}
```

### 3. Interface d'import de fichiers
- Zone de drag & drop pour fichiers Excel
- Validation du nom de fichier (doit correspondre au nom de la CEL)
- Barre de progression d'upload
- Prévisualisation des données avant validation
- Gestion des erreurs avec messages explicites

### 4. Tableaux de données
- Pagination côté serveur
- Tri par colonnes
- Filtres avancés
- Export en Excel/PDF
- Actions en lot (si applicable)

### 5. Modales et confirmations
- Confirmation de publication avec récapitulatif
- Modales de détails des CELs
- Alertes de succès/erreur avec react-hot-toast

## Types TypeScript requis

```typescript
// Types principaux - Alignés avec les DTOs backend

// Authentification
interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId?: string;
}

interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

// Utilisateurs
interface UserResponseDto {
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

interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId?: string;
  departementCodes?: string[];
  isActive?: boolean;
}

// CELs (Cellules Électorales Locales)
interface CelResponseDto {
  id: string;
  codeCellule: string;
  typeCellule?: string;
  ligneDebutCellule?: number;
  etatResultatCellule?: string;
  nombreBureauxVote?: number;
  libelleCellule: string;
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  lieuxVote: {
    id: string;
    codeLieuVote: string;
    libelleLieuVote: string;
    codeCommune: string;
    libelleCommune: string;
  }[];
  statistiques: {
    totalLieuxVote: number;
    totalBureauxVote: number;
    totalInscrits: number;
    totalVotants: number;
    tauxParticipation: number;
  };
}

interface CelListResponseDto {
  cels: CelResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CelStatsDto {
  totalCels: number;
  celsAvecUtilisateur: number;
  celsSansUtilisateur: number;
  celsParType: Record<string, number>;
  totalLieuxVote: number;
  totalBureauxVote: number;
  totalInscrits: number;
  totalVotants: number;
  tauxParticipationGlobal: number;
}

// Départements
interface DepartementResponseDto {
  id: string;
  codeDepartement: string;
  codeRegion: string;
  libelleDepartement: string;
  statutPublication?: string;
  region: {
    id: string;
    codeRegion: string;
    libelleRegion: string;
  };
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  sousPrefectures: {
    id: string;
    codeSousPrefecture: string;
    libelleSousPrefecture: string;
  }[];
  communes: {
    id: string;
    codeCommune: string;
    libelleCommune: string;
  }[];
  lieuxVote: {
    id: string;
    codeLieuVote: string;
    libelleLieuVote: string;
  }[];
  bureauxVote: {
    id: string;
    numeroBureauVote: string;
    inscrits?: number;
    totalVotants?: number;
  }[];
}

interface DepartementListResponseDto {
  departements: DepartementResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DepartementStatsDto {
  totalDepartements: number;
  departementsAvecUtilisateur: number;
  departementsSansUtilisateur: number;
  totalSousPrefectures: number;
  totalCommunes: number;
  totalLieuxVote: number;
  totalBureauxVote: number;
}

// Upload Excel
enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

interface UploadExcelDto {
  codeCellule: string;
  nomFichier?: string;
  nombreBv?: number;
}

interface ExcelImportResponseDto {
  id: string;
  codeCellule: string;
  nomFichier: string;
  statutImport: ImportStatus;
  messageErreur?: string;
  dateImport: Date;
  nombreLignesImportees: number;
  nombreLignesEnErreur: number;
  details: {
    headers: string[];
    colonnesMappees: Record<string, string>;
    lignesTraitees: number;
    lignesReussies: number;
    lignesEchouees: number;
  };
}

interface ExcelImportListResponseDto {
  imports: ExcelImportResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ExcelImportStatsDto {
  totalImports: number;
  importsReussis: number;
  importsEnErreur: number;
  importsEnCours: number;
  totalLignesImportees: number;
  totalLignesEnErreur: number;
  tauxReussite: number;
  importsParCel: Record<string, number>;
  importsParStatut: Record<ImportStatus, number>;
}

// Données Excel
interface ExcelDataRowDto {
  ordre?: string;
  referenceLieuVote?: string;
  libelleLieuVote?: string;
  numeroBureauVote?: string;
  populationHommes?: string;
  populationFemmes?: string;
  populationTotale?: string;
  personnesAstreintes?: string;
  votantsHommes?: string;
  votantsFemmes?: string;
  totalVotants?: string;
  tauxParticipation?: string;
  bulletinsNuls?: string;
  bulletinsBlancs?: string;
  suffrageExprime?: string;
  score1?: string;
  score2?: string;
  score3?: string;
  score4?: string;
  score5?: string;
  colonneZero?: string;
}

interface ExcelParsedDataDto {
  codeCellule: string;
  nomFichier: string;
  headers: string[];
  dataRows: ExcelDataRowDto[];
  mapping: Record<string, { field: string; index: number; type: string }>;
  nombreBv: number;
  nombreLignes: number;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Dashboard CELs
interface DashboardCelDto {
  id: string;
  codeCellule: string;
  libelleCellule: string;
  typeCellule?: string;
  etatResultatCellule?: string;
  nombreBureauxVote?: number;
  departement: {
    codeDepartement: string;
    libelleDepartement: string;
    codeRegion: string;
    libelleRegion: string;
  };
  import: {
    aImporte: boolean;
    dateDernierImport?: Date;
    nomFichier?: string;
    statutImport?: string;
    messageErreur?: string;
  };
  statistiques: {
    totalLieuxVote: number;
    totalBureauxVote: number;
    totalInscrits: number;
    totalVotants: number;
    tauxParticipation: number;
  };
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface DashboardCelListResponseDto {
  cels: DashboardCelDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filtres: {
    statutImport?: string;
    typeCellule?: string;
    departement?: string;
    region?: string;
    utilisateur?: string;
  };
}

interface DashboardCelFilterDto {
  statutImport?: string;
  typeCellule?: string;
  departement?: string;
  region?: string;
  utilisateur?: string;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
}
```

## API Endpoints à consommer

### Authentification
```
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout
GET /auth/profile
GET /auth/verify
```

### Dashboard
```
GET /dashboard/stats (adaptatif selon le rôle)
GET /dashboard/stats/user (USER)
GET /dashboard/stats/admin (ADMIN)
GET /dashboard/stats/sadmin (SADMIN)
GET /dashboard/cels (CELs selon le rôle)
GET /dashboard/cels/my-cels (USER)
GET /dashboard/cels/department-cels (ADMIN)
GET /dashboard/cels/all-cels (SADMIN)
GET /dashboard/cels/status/:status
GET /dashboard/cels/pending-imports
GET /dashboard/cels/completed-imports
GET /dashboard/cels/error-imports
```

### Utilisateurs
```
GET /users (SADMIN, ADMIN)
POST /users (SADMIN, ADMIN)
GET /users/:id (SADMIN, ADMIN)
PATCH /users/:id (SADMIN, ADMIN)
DELETE /users/:id (SADMIN)
PATCH /users/:id/departements (SADMIN, ADMIN)
DELETE /users/:id/departements (SADMIN, ADMIN)
GET /users/profile/me
PATCH /users/profile/me
```

### CELs (Cellules Électorales Locales)
```
GET /cels (SADMIN, ADMIN, USER)
GET /cels/:codeCellule (SADMIN, ADMIN, USER)
PATCH /cels/:codeCellule (SADMIN, ADMIN)
PATCH /cels/:codeCellule/assign-user (SADMIN, ADMIN)
PATCH /cels/:codeCellule/unassign-user (SADMIN, ADMIN)
GET /cels/stats/overview (SADMIN, ADMIN)
GET /cels/departement/:codeDepartement (SADMIN, ADMIN, USER)
GET /cels/region/:codeRegion (SADMIN, ADMIN, USER)
GET /cels/unassigned/list (SADMIN, ADMIN)
GET /cels/type/:typeCellule (SADMIN, ADMIN, USER)
```

### Départements
```
GET /departements (SADMIN, ADMIN, USER)
GET /departements/:codeDepartement (SADMIN, ADMIN, USER)
PATCH /departements/:codeDepartement (SADMIN, ADMIN)
PATCH /departements/:codeDepartement/assign-user (SADMIN, ADMIN)
PATCH /departements/:codeDepartement/unassign-user (SADMIN, ADMIN)
GET /departements/stats/overview (SADMIN, ADMIN)
GET /departements/region/:codeRegion (SADMIN, ADMIN, USER)
```

### Upload Excel
```
POST /upload/excel (SADMIN, ADMIN, USER)
GET /upload/imports (SADMIN, ADMIN, USER)
GET /upload/stats (SADMIN, ADMIN)
GET /upload/imports/cel/:codeCellule (SADMIN, ADMIN, USER)
GET /upload/imports/statut/:statut (SADMIN, ADMIN)
```

### Paramètres de requête communs
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'éléments par page (défaut: 10)
- `search`: Recherche textuelle
- `regionCode`: Filtre par région
- `hasUser`: Filtre par présence d'utilisateur assigné (boolean)
- `typeCellule`: Filtre par type de CEL
- `statut`: Filtre par statut d'import (PENDING, PROCESSING, IMPORTED, ERROR)
- `statutImport`: Statut d'import de la CEL
- `typeCellule`: Type de cellule électorale
- `search`: Recherche textuelle
- `dateDebut`, `dateFin`: Filtres temporels

## Fonctionnalités spécifiques

### 1. Import de fichiers Excel
- Validation du format et de la structure
- Affichage des erreurs de validation
- Progression en temps réel
- Possibilité d'annuler l'import

### 2. Gestion des états
- Indicateurs visuels pour les statuts d'import Excel (badges colorés)
  - PENDING : Orange
  - PROCESSING : Bleu
  - IMPORTED : Vert
  - ERROR : Rouge
- Indicateurs pour les statuts d'assignation (avec/sans utilisateur)
- Transitions de statut avec animations
- Notifications push pour les changements de statut
- Alertes contextuelles dans le dashboard selon le rôle

### 3. Recherche et filtrage
- Recherche textuelle dans les noms de CELs et départements
- Filtres par région, département, type de CEL, statut d'assignation
- Filtres par statut d'import (PENDING, PROCESSING, IMPORTED, ERROR)
- Filtres temporels (date début, date fin)
- Sauvegarde des préférences de filtrage
- Filtres combinables avec pagination
- Filtrage contextuel selon le rôle utilisateur

### 4. Responsive design
- Adaptation mobile avec navigation drawer
- Tableaux responsive avec scroll horizontal
- Optimisation tactile pour les actions

## Sécurité frontend

### Validation côté client
- Validation des formulaires avec Zod
- Sanitisation des données utilisateur
- Vérification des types de fichiers

### Gestion des tokens
- Stockage sécurisé des tokens JWT via NextAuth.js
- Refresh automatique des tokens via l'API `/auth/refresh`
- Déconnexion automatique en cas d'expiration
- Gestion des sessions avec refresh tokens

## Performance et UX

### Optimisations
- Lazy loading des composants lourds
- Pagination et virtualisation des listes
- Cache des requêtes avec TanStack Query
- Images optimisées avec next/image

### Accessibilité
- Navigation au clavier
- Lecteurs d'écran (ARIA labels)
- Contraste des couleurs respecté
- Focus management

## Livrables attendus

1. **Application Next.js complète** avec toutes les pages fonctionnelles
2. **Composants réutilisables** bien documentés
3. **Tests unitaires** avec Jest et React Testing Library
4. **Documentation technique** du frontend
5. **Guide de déploiement** avec Docker

## Contraintes techniques

- **Compatibilité :** Navigateurs modernes (Chrome 90+, Firefox 88+, Safari 14+)
- **Performance :** Lighthouse score > 90
- **Bundle size :** Optimisé avec code splitting
- **SEO :** Métadonnées appropriées pour les pages publiques

## Coordination avec l'équipe backend

L'équipe backend développe l'API REST avec Nest.js et Prisma. Assurez-vous de :
- Synchroniser les interfaces TypeScript
- Valider les contrats d'API ensemble
- Tester l'intégration régulièrement
- Documenter les formats de données échangées

Bonne chance dans le développement de cette interface moderne et intuitive pour la gestion des résultats électoraux !
