# Exemple de Réponse : GET /upload/imports

## 📋 Endpoint

```http
GET /upload/imports?page=1&limit=10&codeCellule=CEL001&codeRegion=REG01
Authorization: Bearer <token>
```

## 📊 Réponse Complète (Cas Nominal)

```json
{
  "imports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "codeCellule": "CEL001",
      "nomFichier": "CEL Cocody - Angré",
      "statutImport": "COMPLETED",
      "messageErreur": undefined,
      "dateImport": "2025-10-21T14:30:45.123Z",
      "nombreLignesImportees": 150,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 25,
      "importePar": {
        "id": "user-001",
        "numeroUtilisateur": "user-001",
        "nom": "KOUASSI",
        "prenom": "Jean",
        "email": "jean.kouassi@example.com",
        "nomComplet": "Jean KOUASSI",
        "role": {
          "code": "ADMIN",
          "libelle": "Administrateur"
        }
      },
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "REG01",
        "libelleRegion": "Abidjan"
      },
      "details": {
        "headers": [],
        "colonnesMappees": {},
        "lignesTraitees": 150,
        "lignesReussies": 150,
        "lignesEchouees": 0
      }
    },
    {
      "id": "660f9511-f39c-52e5-b827-557766551111",
      "codeCellule": "CEL002",
      "nomFichier": "CEL Cocody - Riviera",
      "statutImport": "COMPLETED",
      "messageErreur": undefined,
      "dateImport": "2025-10-21T15:12:30.456Z",
      "nombreLignesImportees": 200,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 32,
      "importePar": {
        "id": "user-002",
        "numeroUtilisateur": "user-002",
        "nom": "YAO",
        "prenom": "Marie",
        "email": "marie.yao@example.com",
        "nomComplet": "Marie YAO",
        "role": {
          "code": "USER",
          "libelle": "Utilisateur"
        }
      },
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "REG01",
        "libelleRegion": "Abidjan"
      },
      "details": {
        "headers": [],
        "colonnesMappees": {},
        "lignesTraitees": 200,
        "lignesReussies": 200,
        "lignesEchouees": 0
      }
    },
    {
      "id": "770a0622-g40d-63f6-c938-668877662222",
      "codeCellule": "CEL003",
      "nomFichier": "CEL Yopougon - Niangon",
      "statutImport": "COMPLETED",
      "messageErreur": undefined,
      "dateImport": "2025-10-21T16:45:12.789Z",
      "nombreLignesImportees": 180,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 28,
      "importePar": {
        "id": "user-003",
        "numeroUtilisateur": "user-003",
        "nom": "KONE",
        "prenom": "Ibrahim",
        "email": "ibrahim.kone@example.com",
        "nomComplet": "Ibrahim KONE",
        "role": {
          "code": "SADMIN",
          "libelle": "Super Administrateur"
        }
      },
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "REG01",
        "libelleRegion": "Abidjan"
      },
      "details": {
        "headers": [],
        "colonnesMappees": {},
        "lignesTraitees": 180,
        "lignesReussies": 180,
        "lignesEchouees": 0
      }
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

## 🔍 Description des Champs

### Niveau Principal

| Champ | Type | Description |
|-------|------|-------------|
| `imports` | Array | Liste des CELs importées |
| `total` | Number | Nombre total de CELs correspondant aux filtres |
| `page` | Number | Numéro de la page actuelle |
| `limit` | Number | Nombre maximum d'éléments par page |
| `totalPages` | Number | Nombre total de pages disponibles |

### Niveau Import (chaque élément du tableau `imports`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Identifiant unique de la CEL |
| `codeCellule` | String | Code unique de la cellule électorale |
| `nomFichier` | String | Nom/libellé de la CEL (ex: "CEL Cocody - Angré") |
| `statutImport` | Enum | Statut de l'import : `COMPLETED`, `PENDING`, `ERROR` |
| `messageErreur` | String \| undefined | Message d'erreur si statut = ERROR, undefined sinon |
| `dateImport` | String (ISO 8601) | Date et heure de l'import |
| `nombreLignesImportees` | Number | Nombre de lignes (bureaux de vote) importées |
| `nombreLignesEnErreur` | Number | Nombre de lignes en erreur |
| `nombreBureauxVote` | Number | Nombre de bureaux de vote dans la CEL |
| `importePar` | Object \| undefined | ✨ **NOUVEAU** - Informations de l'utilisateur qui a importé |
| `departement` | Object | Informations du département |
| `region` | Object | Informations de la région |
| `details` | Object | Détails de l'import |

### Objet `importePar` ✨ NOUVEAU

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Identifiant unique de l'utilisateur |
| `numeroUtilisateur` | String | ID de l'utilisateur (provenant de la table d'import) |
| `nom` | String | Nom de famille de l'utilisateur (lastName) |
| `prenom` | String | Prénom de l'utilisateur (firstName) |
| `email` | String | Adresse email de l'utilisateur |
| `nomComplet` | String | Nom complet formaté (Prénom NOM) |
| `role` | Object \| undefined | Rôle de l'utilisateur |
| `role.code` | String | Code du rôle (SADMIN, ADMIN, USER) |
| `role.libelle` | String | Libellé du rôle (name du modèle Role) |

> **Note :** Ce champ sera `undefined` si aucun import n'a été effectué pour cette CEL.

### Objet `departement`

| Champ | Type | Description |
|-------|------|-------------|
| `codeDepartement` | String | Code du département (3 chiffres) |
| `libelleDepartement` | String | Nom du département |

### Objet `region`

| Champ | Type | Description |
|-------|------|-------------|
| `codeRegion` | String | Code de la région |
| `libelleRegion` | String | Nom de la région |

### Objet `details`

| Champ | Type | Description |
|-------|------|-------------|
| `headers` | Array | En-têtes du fichier (vide dans cette réponse) |
| `colonnesMappees` | Object | Mapping des colonnes (vide dans cette réponse) |
| `lignesTraitees` | Number | Nombre total de lignes traitées |
| `lignesReussies` | Number | Nombre de lignes importées avec succès |
| `lignesEchouees` | Number | Nombre de lignes ayant échoué |

## 📝 Exemples de Requêtes

### 1. Récupérer toutes les CELs importées (SADMIN/ADMIN)

```http
GET /upload/imports?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
- Toutes les CELs avec statut 'I' (Importé) ou 'P' (Publié)
- Pagination : 20 éléments par page

### 2. Filtrer par CEL spécifique

```http
GET /upload/imports?page=1&limit=10&codeCellule=CEL001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
```json
{
  "imports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "codeCellule": "CEL001",
      "nomFichier": "CEL Cocody - Angré",
      "statutImport": "COMPLETED",
      // ... autres champs
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 3. Filtrer par plusieurs CELs

```http
GET /upload/imports?page=1&limit=10&codeCellule=CEL001&codeCellule=CEL002&codeCellule=CEL003
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
- Liste des CELs CEL001, CEL002 et CEL003 (si elles sont importées)

### 4. Filtrer par région

```http
GET /upload/imports?page=1&limit=10&codeRegion=REG01
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
- Toutes les CELs de la région REG01

### 5. Filtrer par département

```http
GET /upload/imports?page=1&limit=10&codeDepartement=001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
- Toutes les CELs du département 001 (Abidjan)

### 6. Pagination - Page 2

```http
GET /upload/imports?page=2&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
- CELs 11 à 20 (deuxième page)

## 🔐 Réponses Selon les Rôles

### SADMIN / ADMIN

```json
{
  "imports": [
    // Toutes les CELs importées du système
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

### USER (avec départements assignés)

```json
{
  "imports": [
    // Uniquement les CELs des départements assignés à l'utilisateur
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### USER (sans département assigné)

```json
{
  "imports": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

## 📊 Exemple de Réponse avec Pagination Multiple

```http
GET /upload/imports?page=1&limit=2
```

**Réponse :**

```json
{
  "imports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "codeCellule": "CEL001",
      "nomFichier": "CEL Cocody - Angré",
      "statutImport": "COMPLETED",
      "messageErreur": undefined,
      "dateImport": "2025-10-21T14:30:45.123Z",
      "nombreLignesImportees": 150,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 25,
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "REG01",
        "libelleRegion": "Abidjan"
      },
      "details": {
        "headers": [],
        "colonnesMappees": {},
        "lignesTraitees": 150,
        "lignesReussies": 150,
        "lignesEchouees": 0
      }
    },
    {
      "id": "660f9511-f39c-52e5-b827-557766551111",
      "codeCellule": "CEL002",
      "nomFichier": "CEL Cocody - Riviera",
      "statutImport": "COMPLETED",
      "messageErreur": undefined,
      "dateImport": "2025-10-21T15:12:30.456Z",
      "nombreLignesImportees": 200,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 32,
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "REG01",
        "libelleRegion": "Abidjan"
      },
      "details": {
        "headers": [],
        "colonnesMappees": {},
        "lignesTraitees": 200,
        "lignesReussies": 200,
        "lignesEchouees": 0
      }
    }
  ],
  "total": 87,
  "page": 1,
  "limit": 2,
  "totalPages": 44
}
```

**Navigation :**
- Page actuelle : 1
- Total de pages : 44
- Éléments affichés : 2 sur 87

## 🎯 Cas d'Usage Frontend

### Affichage d'une Liste de CELs

```typescript
interface ImportData {
  imports: Import[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Import {
  id: string;
  codeCellule: string;
  nomFichier: string;
  statutImport: 'COMPLETED' | 'PENDING' | 'ERROR';
  messageErreur?: string;
  dateImport: string;
  nombreLignesImportees: number;
  nombreLignesEnErreur: number;
  nombreBureauxVote: number;
  importePar?: {
    id: string;
    numeroUtilisateur: string;
    nom: string;
    prenom: string;
    email: string;
    nomComplet: string;
    role?: {
      code: string;
      libelle: string;
    };
  };
  departement: {
    codeDepartement: string;
    libelleDepartement: string;
  };
  region: {
    codeRegion: string;
    libelleRegion: string;
  };
  details: {
    headers: any[];
    colonnesMappees: Record<string, any>;
    lignesTraitees: number;
    lignesReussies: number;
    lignesEchouees: number;
  };
}

// Exemple d'utilisation
const fetchImports = async (page: number = 1, limit: number = 10) => {
  const response = await fetch(
    `/upload/imports?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data: ImportData = await response.json();
  
  console.log(`Total de CELs importées : ${data.total}`);
  console.log(`Page ${data.page} sur ${data.totalPages}`);
  
  data.imports.forEach(cel => {
    console.log(`
      ${cel.codeCellule} - ${cel.nomFichier}
      Région: ${cel.region.libelleRegion}
      Département: ${cel.departement.libelleDepartement}
      Bureaux de vote: ${cel.nombreBureauxVote}
      Lignes importées: ${cel.nombreLignesImportees}
      Date: ${new Date(cel.dateImport).toLocaleDateString('fr-FR')}
      Importé par: ${cel.importePar?.nomComplet || 'N/A'}
      Rôle: ${cel.importePar?.role?.libelle || 'N/A'}
    `);
  });
  
  return data;
};
```

## ⚠️ Cas d'Erreur

### Erreur 401 - Non Authentifié

```http
GET /upload/imports
```

**Réponse :**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Erreur 403 - Accès Refusé

```http
GET /upload/imports
Authorization: Bearer <token_invalide>
```

**Réponse :**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

## 📈 Métriques Calculées

Pour chaque CEL dans la liste :

- **Taux de réussite** = `(nombreLignesReussies / lignesTraitees) * 100`
- **Taux d'erreur** = `(lignesEchouees / lignesTraitees) * 100`
- **Moyenne de BV par CEL** = `total(nombreBureauxVote) / nombre de CELs`

## 🔗 Endpoints Connexes

- `GET /upload/imports/cel/:codeCellule` - Détails d'une CEL spécifique
- `GET /upload/stats` - Statistiques globales des imports
- `GET /upload/cel/:codeCellule/data` - Données détaillées d'une CEL

---

**Date de Création** : 21 octobre 2025  
**Version** : 1.0  
**Endpoint** : `GET /upload/imports`

