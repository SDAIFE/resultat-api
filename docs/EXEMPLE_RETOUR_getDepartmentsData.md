# Exemple de retour - getDepartmentsData()

## Requête

```http
GET /api/publications/departments/022/data?page=1&limit=2
```

## Réponse (200 OK)

```json
{
  "departments": [
    {
      "codeDepartement": "022",
      "libelleDepartement": "ABIDJAN",
      "inscrits": 2458796,
      "votants": 1234398,
      "participation": 50.21,
      "nombreBureaux": 3845,
      "cels": [
        {
          "codeCellule": "C001",
          "libelleCellule": "CEC ABOBO 01",
          "populationHommes": 52340,
          "populationFemmes": 54120,
          "populationTotale": 106460,
          "personnesAstreintes": 95814,
          "votantsHommes": 24156,
          "votantsFemmes": 25678,
          "totalVotants": 49834,
          "tauxParticipation": 52.01,
          "bulletinsNuls": 1245,
          "suffrageExprime": 47589,
          "bulletinsBlancs": 1000,
          "score1": 12456,
          "score2": 8934,
          "score3": 15678,
          "score4": 6789,
          "score5": 3732,
          "nombreBureaux": 142
        },
        {
          "codeCellule": "C002",
          "libelleCellule": "CEC ABOBO 02",
          "populationHommes": 48920,
          "populationFemmes": 51230,
          "populationTotale": 100150,
          "personnesAstreintes": 90135,
          "votantsHommes": 22450,
          "votantsFemmes": 23890,
          "totalVotants": 46340,
          "tauxParticipation": 51.42,
          "bulletinsNuls": 1156,
          "suffrageExprime": 44184,
          "bulletinsBlancs": 1000,
          "score1": 11567,
          "score2": 8234,
          "score3": 14567,
          "score4": 6123,
          "score5": 3693,
          "nombreBureaux": 135
        },
        {
          "codeCellule": "C016",
          "libelleCellule": "CEC COCODY 01",
          "populationHommes": 65890,
          "populationFemmes": 68340,
          "populationTotale": 134230,
          "personnesAstreintes": 120807,
          "votantsHommes": 31256,
          "votantsFemmes": 33450,
          "totalVotants": 64706,
          "tauxParticipation": 53.56,
          "bulletinsNuls": 1612,
          "suffrageExprime": 62094,
          "bulletinsBlancs": 1000,
          "score1": 16234,
          "score2": 11567,
          "score3": 19890,
          "score4": 8934,
          "score5": 5469,
          "nombreBureaux": 178
        },
        {
          "codeCellule": "C033",
          "libelleCellule": "CEC YOPOUGON 01",
          "populationHommes": 58760,
          "populationFemmes": 61230,
          "populationTotale": 119990,
          "personnesAstreintes": 107991,
          "votantsHommes": 27890,
          "votantsFemmes": 29450,
          "totalVotants": 57340,
          "tauxParticipation": 53.09,
          "bulletinsNuls": 1430,
          "suffrageExprime": 54910,
          "bulletinsBlancs": 1000,
          "score1": 14356,
          "score2": 10234,
          "score3": 17678,
          "score4": 7890,
          "score5": 4752,
          "nombreBureaux": 164
        },
        {
          "codeCellule": "C077",
          "libelleCellule": "CEC BINGERVILLE",
          "populationHommes": 42180,
          "populationFemmes": 44670,
          "populationTotale": 86850,
          "personnesAstreintes": 78165,
          "votantsHommes": 20012,
          "votantsFemmes": 21234,
          "totalVotants": 41246,
          "tauxParticipation": 52.77,
          "bulletinsNuls": 1028,
          "suffrageExprime": 39218,
          "bulletinsBlancs": 1000,
          "score1": 10267,
          "score2": 7345,
          "score3": 12678,
          "score4": 5678,
          "score5": 3250,
          "nombreBureaux": 118
        },
        {
          "codeCellule": "S077",
          "libelleCellule": "CESP BROFODOUME",
          "populationHommes": 18920,
          "populationFemmes": 20340,
          "populationTotale": 39260,
          "personnesAstreintes": 35334,
          "votantsHommes": 8945,
          "votantsFemmes": 9567,
          "totalVotants": 18512,
          "tauxParticipation": 52.39,
          "bulletinsNuls": 462,
          "suffrageExprime": 17050,
          "bulletinsBlancs": 1000,
          "score1": 4456,
          "score2": 3123,
          "score3": 5678,
          "score4": 2345,
          "score5": 1448,
          "nombreBureaux": 53
        },
        {
          "codeCellule": "S078",
          "libelleCellule": "CESP SONGON",
          "populationHommes": 35670,
          "populationFemmes": 37890,
          "populationTotale": 73560,
          "personnesAstreintes": 66204,
          "votantsHommes": 16890,
          "votantsFemmes": 18012,
          "totalVotants": 34902,
          "tauxParticipation": 52.73,
          "bulletinsNuls": 870,
          "suffrageExprime": 33032,
          "bulletinsBlancs": 1000,
          "score1": 8645,
          "score2": 6234,
          "score3": 10678,
          "score4": 4567,
          "score5": 2908,
          "nombreBureaux": 99
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 2,
  "totalPages": 1
}
```

## Exemple avec plusieurs départements

```http
GET /api/publications/departments/data?page=1&limit=3
```

```json
{
  "departments": [
    {
      "codeDepartement": "001",
      "libelleDepartement": "AGBOVILLE",
      "inscrits": 342567,
      "votants": 178934,
      "participation": 52.23,
      "nombreBureaux": 456,
      "cels": [
        {
          "codeCellule": "C101",
          "libelleCellule": "CEC AGBOVILLE 01",
          "populationHommes": 28450,
          "populationFemmes": 29890,
          "populationTotale": 58340,
          "personnesAstreintes": 52506,
          "votantsHommes": 13456,
          "votantsFemmes": 14234,
          "totalVotants": 27690,
          "tauxParticipation": 52.74,
          "bulletinsNuls": 690,
          "suffrageExprime": 26000,
          "bulletinsBlancs": 1000,
          "score1": 6789,
          "score2": 4856,
          "score3": 8345,
          "score4": 3678,
          "score5": 2332,
          "nombreBureaux": 78
        }
      ]
    },
    {
      "codeDepartement": "022",
      "libelleDepartement": "ABIDJAN",
      "inscrits": 2458796,
      "votants": 1234398,
      "participation": 50.21,
      "nombreBureaux": 3845,
      "cels": [
        {
          "codeCellule": "C001",
          "libelleCellule": "CEC ABOBO 01",
          "populationHommes": 52340,
          "populationFemmes": 54120,
          "populationTotale": 106460,
          "personnesAstreintes": 95814,
          "votantsHommes": 24156,
          "votantsFemmes": 25678,
          "totalVotants": 49834,
          "tauxParticipation": 52.01,
          "bulletinsNuls": 1245,
          "suffrageExprime": 47589,
          "bulletinsBlancs": 1000,
          "score1": 12456,
          "score2": 8934,
          "score3": 15678,
          "score4": 6789,
          "score5": 3732,
          "nombreBureaux": 142
        }
      ]
    },
    {
      "codeDepartement": "080",
      "libelleDepartement": "KORHOGO",
      "inscrits": 567890,
      "votants": 296734,
      "participation": 52.25,
      "nombreBureaux": 789,
      "cels": [
        {
          "codeCellule": "C801",
          "libelleCellule": "CEC KORHOGO 01",
          "populationHommes": 47890,
          "populationFemmes": 49560,
          "populationTotale": 97450,
          "personnesAstreintes": 87705,
          "votantsHommes": 22678,
          "votantsFemmes": 23890,
          "totalVotants": 46568,
          "tauxParticipation": 53.09,
          "bulletinsNuls": 1162,
          "suffrageExprime": 44406,
          "bulletinsBlancs": 1000,
          "score1": 11612,
          "score2": 8345,
          "score3": 14234,
          "score4": 6456,
          "score5": 3759,
          "nombreBureaux": 132
        }
      ]
    }
  ],
  "total": 112,
  "page": 1,
  "limit": 3,
  "totalPages": 38
}
```

## Structure détaillée du retour

### Niveau département

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `codeDepartement` | string | Code du département | `"022"` |
| `libelleDepartement` | string | Nom du département | `"ABIDJAN"` |
| `inscrits` | number | Total des inscrits | `2458796` |
| `votants` | number | Total des votants | `1234398` |
| `participation` | number | Taux de participation (%) | `50.21` |
| `nombreBureaux` | number | Nombre de bureaux de vote | `3845` |
| `cels` | array | Liste des CELs agrégées | voir ci-dessous |

### Niveau CEL (dans le tableau `cels`)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `codeCellule` | string | Code de la CEL | `"C001"` |
| `libelleCellule` | string | Nom de la CEL | `"CEC ABOBO 01"` |
| `populationHommes` | number | Population hommes | `52340` |
| `populationFemmes` | number | Population femmes | `54120` |
| `populationTotale` | number | Population totale | `106460` |
| `personnesAstreintes` | number | Personnes astreintes | `95814` |
| `votantsHommes` | number | Votants hommes | `24156` |
| `votantsFemmes` | number | Votants femmes | `25678` |
| `totalVotants` | number | Total votants | `49834` |
| `tauxParticipation` | number | Taux participation (%) | `52.01` |
| `bulletinsNuls` | number | Bulletins nuls | `1245` |
| `suffrageExprime` | number | Suffrages exprimés | `47589` |
| `bulletinsBlancs` | number | Bulletins blancs | `1000` |
| `score1` | number | Voix candidat 1 | `12456` |
| `score2` | number | Voix candidat 2 | `8934` |
| `score3` | number | Voix candidat 3 | `15678` |
| `score4` | number | Voix candidat 4 | `6789` |
| `score5` | number | Voix candidat 5 | `3732` |
| `nombreBureaux` | number | Nombre de BV agrégés | `142` |

## Notes importantes

1. **Agrégation par CEL** : Les données sont agrégées par CEL. Si une CEL couvre plusieurs bureaux de vote, les chiffres sont la somme de tous les bureaux.

2. **Filtrage par statut** : Seules les CELs avec `etatResultatCellule` = `'I'` (Importé) ou `'P'` (Publié) sont incluses.

3. **Départements vs Communes** : 
   - Pour Abidjan (022), les données sont au niveau département (agrégation de toutes les communes)
   - Si vous voulez les données par commune d'Abidjan, vous devrez appeler l'endpoint spécifique

4. **Pagination** : Les départements sont paginés, mais toutes les CELs d'un département sont retournées (pas de pagination au niveau CEL)

5. **Calculs** :
   - `participation` = (votants / inscrits) × 100
   - `nombreBureaux` = somme des bureaux de toutes les CELs
   - `inscrits` = somme de `populationTotale` de toutes les CELs
   - `votants` = somme de `totalVotants` de toutes les CELs

## Cas d'usage

### Afficher les résultats d'Abidjan seulement
```http
GET /api/publications/departments/022/data?page=1&limit=1
```

### Rechercher un département
```http
GET /api/publications/departments/data?search=KORHOGO&page=1&limit=10
```

### Récupérer tous les départements (sans pagination)
```http
GET /api/publications/departments/data?page=1&limit=200
```

