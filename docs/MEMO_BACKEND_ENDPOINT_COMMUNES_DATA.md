# 📋 MÉMO BACKEND : Endpoint Données Communes d'Abidjan

**Date** : 21 octobre 2025  
**De** : Équipe Frontend Next.js  
**Pour** : Équipe Backend NestJS  
**Objet** : ✅ Endpoint manquant/problème RÉSOLU

**Statut** : ✅ **IMPLÉMENTÉ**  
**Endpoint créé** : `GET /api/publications/communes/:codeCommune/data`  
**Documentation** : [ENDPOINT_COMMUNES_DATA_IMPLEMENTATION.md](./ENDPOINT_COMMUNES_DATA_IMPLEMENTATION.md)

---

## 🚨 Problème Identifié (RÉSOLU)

### Situation actuelle

Lorsque le frontend tente de récupérer les **données agrégées** (CELs, résultats, etc.) d'une **commune d'Abidjan**, l'endpoint actuel retourne un tableau vide :

```json
{
  "departments": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

### Requête effectuée par le frontend

```http
GET /api/publications/departments/022-004/data
```

**Code commune** : `022-004` (ABIDJAN - COCODY)

### Réponse reçue

```json
{
  "departments": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

❌ **Aucune donnée** n'est retournée.

---

## ✅ Solution Attendue

### Option 1 : Endpoint séparé pour les communes (recommandé)

Créer un endpoint spécifique pour les communes :

```http
GET /api/publications/communes/:codeCommune/data
```

**Exemple** :
```http
GET /api/publications/communes/022-004/data
```

**Réponse attendue** :
```json
{
  "entities": [
    {
      "inscrits": 150000,
      "votants": 90000,
      "participation": 60.0,
      "nombreBureaux": 25,
      "cels": [
        {
          "codeCellule": "C001",
          "libelleCellule": "CEC COCODY 01",
          "populationHommes": 25000,
          "populationFemmes": 28000,
          "populationTotale": 53000,
          "personnesAstreintes": 50000,
          "votantsHommes": 15000,
          "votantsFemmes": 16000,
          "totalVotants": 31000,
          "tauxParticipation": 58.49,
          "bulletinsNuls": 500,
          "suffrageExprime": 30500,
          "bulletinsBlancs": 200,
          "score1": 18000,
          "score2": 8000,
          "score3": 2500,
          "score4": 1500,
          "score5": 500,
          "nombreBureaux": 7
        },
        {
          "codeCellule": "C002",
          "libelleCellule": "CEC COCODY 02",
          "populationHommes": 22000,
          "populationFemmes": 25000,
          "populationTotale": 47000,
          "personnesAstreintes": 45000,
          "votantsHommes": 13000,
          "votantsFemmes": 14000,
          "totalVotants": 27000,
          "tauxParticipation": 57.45,
          "bulletinsNuls": 400,
          "suffrageExprime": 26600,
          "bulletinsBlancs": 150,
          "score1": 16000,
          "score2": 7000,
          "score3": 2000,
          "score4": 1200,
          "score5": 400,
          "nombreBureaux": 6
        }
        // ... autres CELs de la commune COCODY (7 CELs au total)
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### Option 2 : Unifier l'endpoint départements (alternative)

Modifier l'endpoint `/api/publications/departments/:code/data` pour qu'il **détecte automatiquement** si le code est :
- Un département : `"001"`, `"080"`, etc.
- Une commune : `"022-004"`, `"022-010"`, etc.

**Logique backend** :
```typescript
async getDepartmentOrCommuneData(code: string) {
  const isCommune = code.includes('-');
  
  if (isCommune) {
    // Récupérer les données de la commune
    return this.getCommuneData(code);
  } else {
    // Récupérer les données du département
    return this.getDepartmentData(code);
  }
}
```

**Réponse** :
- Pour un département : `{ departments: [...], total: 1, ... }`
- Pour une commune : `{ entities: [...], total: 1, ... }` (ou `departments` avec une seule entité)

---

## 📊 Cas de Test

### Test 1 : Département classique (fonctionne actuellement)

```http
GET /api/publications/departments/001/data
```

**Attendu** : ✅ Données du département AGBOVILLE

---

### Test 2 : Commune d'Abidjan (ne fonctionne PAS actuellement)

```http
GET /api/publications/communes/022-004/data
```

**OU (si Option 2)**

```http
GET /api/publications/departments/022-004/data
```

**Attendu** : ✅ Données de la commune ABIDJAN - COCODY (7 CELs)

---

### Test 3 : Autre commune d'Abidjan

```http
GET /api/publications/communes/022-010/data
```

**Attendu** : ✅ Données de la commune ABIDJAN - YOPOUGON (12 CELs)

---

## 🔧 Détails Techniques

### Structure de la réponse attendue pour une commune

```typescript
interface CommuneDataResponse {
  entities: [
    {
      inscrits: number;          // Population totale inscrite
      votants: number;           // Nombre total de votants
      participation: number;     // Taux de participation en %
      nombreBureaux: number;     // Nombre total de bureaux de vote
      cels: CelAggregatedData[]; // Tableau des CELs de la commune
    }
  ];
  total: 1;                      // Toujours 1 pour une seule commune
  page: 1;
  limit: 10;
  totalPages: 1;
}

interface CelAggregatedData {
  codeCellule: string;           // Ex: "C001"
  libelleCellule: string;        // Ex: "CEC COCODY 01"
  populationHommes: number;
  populationFemmes: number;
  populationTotale: number;
  personnesAstreintes: number;
  votantsHommes: number;
  votantsFemmes: number;
  totalVotants: number;
  tauxParticipation: number;     // En %
  bulletinsNuls: number;
  suffrageExprime: number;
  bulletinsBlancs: number;
  score1: number;                // RHDP - ALASSANE OUATTARA
  score2: number;                // MGC - EHIVET SIMONE épouse GBAGBO
  score3: number;                // GP-PAIX - LAGOU ADJOUA HENRIETTE
  score4: number;                // CODE - BILLON JEAN-LOUIS EUGENE
  score5: number;                // INDEPENDANT - DON-MELLO SENIN AHOUA JACOB
  nombreBureaux: number;         // Nombre de bureaux dans cette CEL
}
```

---

## 🎯 Impact Frontend

### Code actuel (frontend)

```typescript
// ❌ NE FONCTIONNE PAS pour les communes
const data = await apiClient.get(`/publications/departments/${entity.code}/data`);
```

### Code corrigé (frontend)

```typescript
// ✅ FONCTIONNE pour départements ET communes
const isCommune = entity.code.includes('-');
const endpoint = isCommune 
  ? `/publications/communes/${entity.code}/data`
  : `/publications/departments/${entity.code}/data`;

const data = await apiClient.get(endpoint);
```

---

## 📝 Liste des 14 Communes d'Abidjan

Pour référence, voici les codes des 14 communes à tester :

| Code      | Libellé                    | Nombre de CELs |
|-----------|----------------------------|----------------|
| `022-001` | ABIDJAN - ABOBO            | 10             |
| `022-002` | ABIDJAN - ADJAME           | 3              |
| `022-001` | ABIDJAN - ANYAMA           | 3              |
| `022-003` | ABIDJAN - ATTECOUBE        | 3              |
| `022-001` | ABIDJAN - BINGERVILLE      | 3              |
| `022-098` | ABIDJAN - BROFODOUME       | 1              |
| `022-004` | ABIDJAN - COCODY           | 7              |
| `022-005` | ABIDJAN - KOUMASSI         | 4              |
| `022-006` | ABIDJAN - MARCORY          | 2              |
| `022-007` | ABIDJAN - PLATEAU          | 2              |
| `022-008` | ABIDJAN - PORT-BOUET       | 3              |
| `022-001` | ABIDJAN - SONGON           | 1              |
| `022-009` | ABIDJAN - TREICHVILLE      | 2              |
| `022-010` | ABIDJAN - YOPOUGON         | 12             |

**Total** : 56 CELs pour Abidjan

---

## ✅ Actions Requises (Backend)

### Priorité 1 : Endpoint communes/data

- [ ] Créer endpoint `GET /api/publications/communes/:code/data`
- [ ] Retourner les données agrégées de la commune avec ses CELs
- [ ] Structure de réponse : `{ entities: [...], total: 1, ... }`

### Priorité 2 : Tests

- [ ] Tester avec `022-004` (COCODY - 7 CELs)
- [ ] Tester avec `022-010` (YOPOUGON - 12 CELs)
- [ ] Tester avec `022-098` (BROFODOUME - 1 CEL)
- [ ] Vérifier que les données agrégées sont correctes

### Priorité 3 : Documentation

- [ ] Ajouter l'endpoint dans la documentation Swagger
- [ ] Préciser la différence entre `/departments/:code/data` et `/communes/:code/data`

---

## 📞 Contact

Si vous avez besoin de clarifications ou de tests supplémentaires, n'hésitez pas à contacter l'équipe frontend.

**Urgence** : 🔴 HAUTE (bloque l'affichage des résultats des communes d'Abidjan)

---

**Dernière mise à jour** : 21 octobre 2025

