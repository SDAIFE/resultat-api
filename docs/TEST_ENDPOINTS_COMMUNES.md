# 🧪 Tests Endpoints Communes d'Abidjan

**Date** : 21 octobre 2025  
**Objectif** : Vérifier que les endpoints communes retournent bien les données

---

## 📋 Tests à effectuer

### Test 1 : Liste des entités (devrait fonctionner)

```http
GET /api/publications/departments?page=1&limit=150
Authorization: Bearer <token>
```

**Résultat attendu** :
```json
{
  "entities": [
    // 125 entités (111 départements + 14 communes)
  ],
  "total": 125
}
```

✅ **Statut** : Fonctionne (confirmé)

---

### Test 2 : Données d'un département (devrait fonctionner)

```http
GET /api/publications/departments/001/data
Authorization: Bearer <token>
```

**Résultat attendu** :
```json
{
  "departments": [
    {
      "inscrits": 150000,
      "votants": 90000,
      "participation": 60.0,
      "nombreBureaux": 25,
      "cels": [
        // Liste des CELs du département
      ]
    }
  ],
  "total": 1
}
```

✅ **Statut** : Fonctionne (confirmé)

---

### Test 3 : Données d'une commune (À TESTER)

```http
GET /api/publications/communes/022-004/data
Authorization: Bearer <token>
```

**OU** (si backend a unifié l'endpoint)

```http
GET /api/publications/departments/022-004/data
Authorization: Bearer <token>
```

**Résultat attendu** :
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
        }
        // ... 6 autres CELs de COCODY
      ]
    }
  ],
  "total": 1
}
```

❓ **Statut** : À tester par le backend

---

### Test 4 : Autres communes à tester

#### YOPOUGON (12 CELs - la plus grande)
```http
GET /api/publications/communes/022-010/data
```

#### BROFODOUME (1 CEL - la plus petite)
```http
GET /api/publications/communes/022-098/data
```

#### ABOBO (10 CELs)
```http
GET /api/publications/communes/022-001/data
```

---

## 🔍 Diagnostic actuel

### Comportement observé (frontend)

Quand on clique sur une commune d'Abidjan dans le tableau :
1. Le frontend appelle `/publications/departments/022-004/data`
2. Le backend retourne :
   ```json
   {
     "departments": [],
     "total": 0
   }
   ```
3. Le modal affiche : "❌ Aucune donnée trouvée dans la réponse"

### Correction appliquée (frontend)

Le frontend appelle maintenant :
- `/publications/communes/022-004/data` pour les communes
- `/publications/departments/001/data` pour les départements

---

## 📊 Exemples de réponses attendues

### Département AGBOVILLE (001)

```json
{
  "departments": [
    {
      "inscrits": 245680,
      "votants": 147408,
      "participation": 60.0,
      "nombreBureaux": 89,
      "cels": [
        {
          "codeCellule": "C401",
          "libelleCellule": "CEC AGBOVILLE 01",
          "populationTotale": 30000,
          "totalVotants": 18000,
          "nombreBureaux": 11
        }
        // ... autres CELs
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Commune COCODY (022-004)

```json
{
  "entities": [
    {
      "inscrits": 187500,
      "votants": 112500,
      "participation": 60.0,
      "nombreBureaux": 52,
      "cels": [
        {
          "codeCellule": "C001",
          "libelleCellule": "CEC COCODY 01",
          "populationTotale": 53000,
          "totalVotants": 31000,
          "nombreBureaux": 7
        },
        {
          "codeCellule": "C002",
          "libelleCellule": "CEC COCODY 02",
          "populationTotale": 47000,
          "totalVotants": 27000,
          "nombreBureaux": 6
        }
        // ... 5 autres CELs (total 7)
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

## ✅ Checklist Backend

- [ ] Endpoint `/api/publications/communes/:code/data` existe
- [ ] Retourne la structure avec `entities` (et non `departments`)
- [ ] Contient toutes les CELs de la commune avec données agrégées
- [ ] Gère les erreurs 404 si commune non trouvée
- [ ] Requiert authentication (JWT Bearer)
- [ ] Fonctionne pour les 14 communes d'Abidjan

---

## 🐛 Erreurs possibles

### Erreur 404 - Commune non trouvée
```json
{
  "statusCode": 404,
  "message": "Commune 022-004 non trouvée",
  "error": "Not Found"
}
```

### Erreur 401 - Non authentifié
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Erreur 403 - Permissions insuffisantes
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

**Prochaines étapes** :
1. Backend : Implémenter l'endpoint `/api/publications/communes/:code/data`
2. Backend : Tester avec les 3 communes listées ci-dessus
3. Frontend : Valider que les données s'affichent correctement dans le modal

