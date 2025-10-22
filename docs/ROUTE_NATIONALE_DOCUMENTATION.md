# 🌍 Route Nationale - Documentation

## 📋 Vue d'ensemble

La route `GET /api/publications/national/data` permet de récupérer les données électorales nationales agrégées, similaires au tableau de résultats présenté dans l'image `img-result-national.png`.

## 🚀 Endpoint

```http
GET /api/publications/national/data
```

### 🔐 Authentification
- **Requis** : Token JWT valide
- **Rôles autorisés** : `SADMIN`, `ADMIN`, `USER`

### 📤 Réponse

```typescript
{
  // Métriques générales
  nombreBureauxVote: number;
  inscrits: number;
  votants: number;
  tauxParticipation: number;
  
  // Métriques de validité
  bulletinsNuls: {
    nombre: number;
    pourcentage: number;
  };
  suffrageExprime: number;
  bulletinsBlancs: {
    nombre: number;
    pourcentage: number;
  };
  
  // Scores des candidats
  candidats: {
    nom: string;
    parti: string;
    score: number;
    pourcentage: number;
  }[];
  
  // Métadonnées
  dateCalcul: string;
  nombreCels: number;
  nombreCelsImportees: number;
}
```

## 📊 Exemple de Réponse

```json
{
  "nombreBureauxVote": 771,
  "inscrits": 270799,
  "votants": 32525,
  "tauxParticipation": 12.01,
  "bulletinsNuls": {
    "nombre": 3307,
    "pourcentage": 10.17
  },
  "suffrageExprime": 25231,
  "bulletinsBlancs": {
    "nombre": 5580,
    "pourcentage": 22.12
  },
  "candidats": [
    {
      "nom": "ALASSANE OUATTARA",
      "parti": "RHDP",
      "score": 4006,
      "pourcentage": 15.88
    },
    {
      "nom": "AFFI N'GUESSAN PASCAL",
      "parti": "FPI",
      "score": 3918,
      "pourcentage": 15.53
    },
    {
      "nom": "BEDIE KONAN AIME HENRI",
      "parti": "PDCI-RDA",
      "score": 3926,
      "pourcentage": 15.56
    },
    {
      "nom": "KOUADIO KONAN BERTIN",
      "parti": "INDEPENDANT",
      "score": 3929,
      "pourcentage": 15.57
    }
  ],
  "dateCalcul": "2025-10-21T21:26:54.570Z",
  "nombreCels": 16,
  "nombreCelsImportees": 771
}
```

## 🔍 Logique Métier

### 1. **Récupération des CELs**
- Filtre les CELs avec statut `I` (Importé) ou `P` (Publié)
- Récupère uniquement les CELs ayant des données valides

### 2. **Agrégation des Données**
- Somme toutes les métriques des CELs importées :
  - `populationTotale` → `inscrits`
  - `totalVotants` → `votants`
  - `bulletinsNuls` → `bulletinsNuls.nombre`
  - `suffrageExprime` → `suffrageExprime`
  - `bulletinsBlancs` → `bulletinsBlancs.nombre`
  - `score1-5` → scores des candidats

### 3. **Calcul des Pourcentages**
- **Taux de participation** : `(votants / inscrits) * 100`
- **Bulletins nuls** : `(bulletinsNuls / votants) * 100`
- **Bulletins blancs** : `(bulletinsBlancs / suffrageExprime) * 100`
- **Scores candidats** : `(score / suffrageExprime) * 100`

### 4. **Comptage des Bureaux**
- Compte tous les bureaux de vote liés aux CELs importées
- Utilise la relation `TblCel` → `TblLv` → `TblBv`

## 🎯 Correspondance avec l'Image

| Image | API | Description |
|-------|-----|-------------|
| **Nombre de bureaux de vote** | `nombreBureauxVote` | 17 601 → 771 (données actuelles) |
| **Inscrits** | `inscrits` | 6 066 441 → 270 799 |
| **Votants** | `votants` | 3 269 813 → 32 525 |
| **Taux de participation** | `tauxParticipation` | 53,90% → 12,01% |
| **Bulletins nuls** | `bulletinsNuls.nombre` | 53 904 → 3 307 |
| **Bulletins nuls %** | `bulletinsNuls.pourcentage` | 1,65% → 10,17% |
| **Suffrages exprimés** | `suffrageExprime` | 3 215 909 → 25 231 |
| **Bulletins blancs** | `bulletinsBlancs.nombre` | 35 099 → 5 580 |
| **Bulletins blancs %** | `bulletinsBlancs.pourcentage` | 1,09% → 22,12% |

## 🏛️ Candidats Supportés

| Candidat | Parti | Score API | Pourcentage API |
|----------|-------|-----------|-----------------|
| **ALASSANE OUATTARA** | RHDP | `score1` | Calculé |
| **AFFI N'GUESSAN PASCAL** | FPI | `score2` | Calculé |
| **BEDIE KONAN AIME HENRI** | PDCI-RDA | `score3` | Calculé |
| **KOUADIO KONAN BERTIN** | INDEPENDANT | `score4` | Calculé |

## 🔧 Implémentation Technique

### Fichiers Modifiés

1. **`src/publication/dto/publication-response.dto.ts`**
   - Ajout de `NationalDataResponse`

2. **`src/publication/publication.service.ts`**
   - Méthode `getNationalData()`
   - Logique d'agrégation nationale

3. **`src/publication/publication.controller.ts`**
   - Route `GET /api/publications/national/data`
   - Authentification et autorisation

### Scripts de Test

- **`scripts/test-route-nationale.ts`** : Test complet de la logique

## 🚀 Utilisation Frontend

```typescript
// Appel API
const response = await fetch('/api/publications/national/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const nationalData = await response.json();

// Affichage des métriques
console.log(`Participation : ${nationalData.tauxParticipation}%`);
console.log(`Inscrits : ${nationalData.inscrits.toLocaleString()}`);
console.log(`Votants : ${nationalData.votants.toLocaleString()}`);

// Affichage des candidats
nationalData.candidats.forEach(candidat => {
  console.log(`${candidat.parti} - ${candidat.nom} : ${candidat.pourcentage}%`);
});
```

## ✅ Statut

- ✅ **Route créée** : `GET /api/publications/national/data`
- ✅ **Service implémenté** : `getNationalData()`
- ✅ **DTO défini** : `NationalDataResponse`
- ✅ **Test validé** : Script de test fonctionnel
- ✅ **Documentation** : Complète

La route est **prête pour le frontend** ! 🎉
