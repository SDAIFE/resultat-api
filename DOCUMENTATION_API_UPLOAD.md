# API Upload de Fichiers Excel - Documentation

## Vue d'ensemble

L'API d'upload permet d'importer des fichiers Excel contenant des données électorales et de gérer les imports existants. Toutes les routes nécessitent une authentification JWT et des permissions spécifiques selon le rôle de l'utilisateur.

## Base URL

```
/upload
```

## Authentification

Toutes les routes nécessitent :
- Header `Authorization: Bearer {token}`
- Rôles requis : `SADMIN`, `ADMIN`, ou `USER` (selon la route)

---

## Routes

### 1. Upload d'un fichier Excel

**Endpoint :** `POST /upload/excel`

**Permissions :** `SADMIN`, `ADMIN`, `USER`

**Description :** Upload et traitement d'un fichier Excel contenant des données électorales.

#### Paramètres de la requête

**Content-Type :** `multipart/form-data`

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `file` | File | ✅ | Fichier Excel (.xlsx, .xls, .xlsm) |
| `codeCellule` | string | ✅ | Code de la Cellule Electorale Locale |
| `nomFichier` | string | ❌ | Nom personnalisé pour le fichier |
| `nombreBv` | number | ❌ | Nombre de bureaux de vote attendus |

#### Contraintes du fichier

- **Types acceptés :** `.xlsx`, `.xls`, `.xlsm`
- **Taille maximale :** 10MB
- **Format :** Fichier Excel avec en-têtes à partir de la ligne 12

#### Réponse de succès

**Code :** `200 OK`

```typescript
{
  id: string;
  codeCellule: string;
  nomFichier: string;
  statutImport: "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";
  messageErreur?: string;
  dateImport: string; // ISO 8601
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
```

#### Erreurs possibles

| Code | Message | Description |
|------|---------|-------------|
| `400` | "Aucun fichier fourni" | Aucun fichier dans la requête |
| `400` | "Type de fichier non autorisé..." | Format de fichier invalide |
| `413` | "File too large" | Fichier dépasse 10MB |
| `422` | "Le code de la CEL est requis" | `codeCellule` manquant |
| `500` | "Erreur lors du traitement..." | Erreur interne du serveur |

---

### 2. Liste des imports

**Endpoint :** `GET /upload/imports`

**Permissions :** `SADMIN`, `ADMIN`, `USER`

**Description :** Récupère la liste paginée des imports Excel avec filtres optionnels.

#### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | number | ❌ | 1 | Numéro de page |
| `limit` | number | ❌ | 10 | Nombre d'éléments par page |
| `codeCellule` | string | ❌ | - | Filtrer par code CEL |
| `statut` | ImportStatus | ❌ | - | Filtrer par statut |

#### Réponse de succès

**Code :** `200 OK`

```typescript
{
  imports: Array<{
    id: string;
    codeCellule: string;
    nomFichier: string;
    statutImport: "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";
    messageErreur?: string;
    dateImport: string;
    nombreLignesImportees: number;
    nombreLignesEnErreur: number;
    details: {
      headers: string[];
      colonnesMappees: Record<string, string>;
      lignesTraitees: number;
      lignesReussies: number;
      lignesEchouees: number;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

### 3. Statistiques des imports

**Endpoint :** `GET /upload/stats`

**Permissions :** `SADMIN`, `ADMIN`

**Description :** Récupère les statistiques globales des imports Excel.

#### Réponse de succès

**Code :** `200 OK`

```typescript
{
  totalImports: number;
  importsReussis: number;
  importsEnErreur: number;
  importsEnCours: number;
  totalLignesImportees: number;
  totalLignesEnErreur: number;
  tauxReussite: number; // Pourcentage (0-100)
  importsParCel: Record<string, number>; // Code CEL -> nombre d'imports
  importsParStatut: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    ERROR: number;
  };
}
```

---

### 4. Imports par CEL

**Endpoint :** `GET /upload/imports/cel/:codeCellule`

**Permissions :** `SADMIN`, `ADMIN`, `USER`

**Description :** Récupère les imports d'une Cellule Electorale Locale spécifique.

#### Paramètres d'URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `codeCellule` | string | ✅ | Code de la CEL |

#### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | number | ❌ | 1 | Numéro de page |
| `limit` | number | ❌ | 10 | Nombre d'éléments par page |

#### Réponse

Identique à [Liste des imports](#2-liste-des-imports)

---

### 5. Imports par statut

**Endpoint :** `GET /upload/imports/statut/:statut`

**Permissions :** `SADMIN`, `ADMIN`

**Description :** Récupère les imports filtrés par statut.

#### Paramètres d'URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `statut` | ImportStatus | ✅ | Statut d'import |

#### Valeurs possibles pour `statut`

- `PENDING` : En attente de traitement
- `PROCESSING` : En cours de traitement
- `COMPLETED` : Traitement terminé avec succès
- `ERROR` : Erreur lors du traitement

#### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | number | ❌ | 1 | Numéro de page |
| `limit` | number | ❌ | 10 | Nombre d'éléments par page |

#### Réponse

Identique à [Liste des imports](#2-liste-des-imports)

---

## Types de données

### ImportStatus (Enum)

```typescript
enum ImportStatus {
  PENDING = 'PENDING',        // En attente
  PROCESSING = 'PROCESSING',  // En cours
  COMPLETED = 'COMPLETED',    // Terminé
  ERROR = 'ERROR'             // Erreur
}
```

### Structure des données Excel attendue

Le fichier Excel suit un format spécifique pour les fichiers CEL (Cellule Electorale Locale) :

#### **Structure du fichier :**

| Lignes | Contenu | Description |
|--------|---------|-------------|
| **1-5** | Métadonnées | Informations générales, titre, etc. |
| **6-11** | En-têtes | Colonnes combinées sur plusieurs lignes |
| **12+** | Données | Données des bureaux de vote |

#### **Extraction des données :**

- **En-têtes** : Extraits des lignes 6-11 (combinés automatiquement)
- **Données** : Extraction à partir de la **ligne 12**
- **Mapping automatique** : Les colonnes sont mappées selon leur nom dans les en-têtes

#### **Colonnes attendues (mapping automatique) :**

| Nom d'en-tête Excel | Champ DB | Requis | Type | Description |
|---------------------|----------|--------|------|-------------|
| `ORD` | `ordre` | ✅ | number | Ordre du bureau de vote |
| `BV` | `numeroBureauVote` | ✅ | string | Numéro du bureau de vote |
| `TOTAL INSCRIT` | `populationTotale` | ✅ | number | Population totale |
| `POPULATION ELECTORALE HOMMES` | `populationHommes` | ❌ | number | Population masculine |
| `FEMMES` (col 12) | `populationFemmes` | ❌ | number | Population féminine |
| `PERS. ASTREINTE` | `personnesAstreintes` | ❌ | number | Personnes astreintes |
| `VOTANTS HOMMES` | `votantsHommes` | ❌ | number | Votants hommes |
| `FEMMES` (col 17) | `votantsFemmes` | ❌ | number | Votants femmes |
| `TOTAL` (col 18) | `totalVotants` | ❌ | number | Total des votants |
| `TAUX DE PARTICIPATION` | `tauxParticipation` | ❌ | number | Taux de participation (%) |
| `BULLETINS NULS` | `bulletinsNuls` | ❌ | number | Bulletins nuls |
| `BULLETINS BLANCS` | `bulletinsBlancs` | ❌ | number | Bulletins blancs |
| `SUFFR. EXPRIMES` | `suffrageExprime` | ❌ | number | Suffrage exprimé |
| `GP-PAIX LAGOU ADJOUA HENRIETTE` | `score1` | ❌ | number | Score candidat 1 |
| `CODE BILLON JEAN-LOUIS EUGENE` | `score2` | ❌ | number | Score candidat 2 |
| `MGC EHIVET SIMONE ÉPOUSE GBAGBO` | `score3` | ❌ | number | Score candidat 3 |
| `INDEPENDANT DON-MELLO SENIN AHOUA JACOB` | `score4` | ❌ | number | Score candidat 4 |
| `RHDP ALASSANE OUATTARA` | `score5` | ❌ | number | Score candidat 5 |
| `CEC [CEL] LIEU DE VOTE` | `referenceLieuVote` | ❌ | string | Référence du lieu de vote |

#### **Format spécial pour la colonne CEC :**

La colonne CEC peut contenir :
- **Format complet** : `"CEC MARCORY 02 LIEU DE VOTE TOTAL POURCENTAGE"`
- **Code numérique** : `"022001006001"` (référence du lieu de vote)

Le système extrait automatiquement :
- `codeCel` : "MARCORY 02"
- `referenceLieuVote` : Code du lieu de vote
- `libelleLieuVote` : Libellé complet

#### **Validation des données :**

**Champs obligatoires :**
- `ordre` : Doit être présent et non vide
- `numeroBureauVote` : Doit être présent et non vide  
- `populationTotale` : Doit être présent et non vide

**Validation des lignes :**
- Chaque ligne de données (à partir de la ligne 12) est validée
- Les erreurs sont reportées avec le numéro de ligne Excel réel
- Les lignes en erreur sont comptabilisées dans `nombreLignesEnErreur`

**Gestion des colonnes :**
- Colonnes manquantes : Signalées dans `colonnesManquantes`
- Colonnes inconnues : Signalées dans `colonnesInconnues`
- Mapping automatique : Basé sur les noms d'en-têtes exacts

---

## Gestion des erreurs

### Codes d'erreur HTTP

| Code | Type | Description |
|------|------|-------------|
| `200` | Succès | Opération réussie |
| `400` | Bad Request | Données invalides ou manquantes |
| `401` | Unauthorized | Token d'authentification manquant/invalide |
| `403` | Forbidden | Permissions insuffisantes |
| `413` | Payload Too Large | Fichier trop volumineux |
| `422` | Unprocessable Entity | Erreurs de validation |
| `500` | Internal Server Error | Erreur interne du serveur |

### Format des erreurs

```typescript
{
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}
```

### Erreurs de validation Excel

Les erreurs de validation sont retournées dans le champ `messageErreur` de la réponse :

- **Colonnes manquantes** : Colonnes obligatoires absentes
- **Lignes en erreur** : Données invalides ou manquantes
- **Format invalide** : Structure du fichier non conforme

---

## Exemple de workflow

1. **Upload du fichier** → `POST /upload/excel`
2. **Vérification du statut** → `GET /upload/imports?codeCellule=XXX`
3. **Consultation des statistiques** → `GET /upload/stats` (si autorisé)

Le traitement est asynchrone. Le statut évolue de `PENDING` → `PROCESSING` → `COMPLETED` ou `ERROR`.
