# ✅ Implémentation Endpoint Communes/Data

**Date** : 21 octobre 2025  
**Statut** : ✅ Implémenté  
**Équipe** : Backend NestJS

---

## 🎯 Endpoint Implémenté

```http
GET /api/publications/communes/:codeCommune/data
```

**Description** : Récupère les données agrégées d'une commune d'Abidjan avec toutes ses CELs

---

## 📝 Détails de l'Implémentation

### Contrôleur (`src/publication/publication.controller.ts`)

```typescript
/**
 * 🔟 GET /api/publications/communes/:codeCommune/data
 * Récupérer les données agrégées d'une commune d'Abidjan avec ses CELs
 */
@Get('communes/:codeCommune/data')
@Roles('SADMIN', 'ADMIN', 'USER')
async getCommuneData(
  @Param('codeCommune') codeCommune: string,
  @CurrentUser() user: any,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  @Query('search') search?: string
): Promise<DepartmentDataResponse> {
  const query = {
    page,
    limit,
    codeCommune,
    search
  };
  
  return this.publicationService.getCommuneData(query, user.id, user.role?.code);
}
```

### Service (`src/publication/publication.service.ts`)

La méthode `getCommuneData()` a été ajoutée avec la logique suivante :

1. **Récupération de la commune** :
   - Recherche dans `TblCom` par `codeCommune`
   - Support de la pagination
   - Filtrage par rôle utilisateur (USER voit uniquement ses communes assignées)

2. **Récupération des CELs** :
   - Recherche des CELs de la commune dans `TblCel`
   - Filtrage par `codeDepartement` ET `codeCommune`
   - Seulement les CELs avec statut 'I' (Importé) ou 'P' (Publié)

3. **Agrégation des données** :
   - Pour chaque CEL, récupération des données depuis `TblImportExcelCel`
   - Seulement les imports avec `statutImport = 'COMPLETED'`
   - Calcul des totaux par CEL :
     - Population (hommes, femmes, totale)
     - Votants (hommes, femmes, total)
     - Taux de participation moyen
     - Bulletins (nuls, blancs, suffrage exprimé)
     - Scores des 5 candidats
     - Nombre de bureaux de vote

4. **Métriques de la commune** :
   - Inscrits totaux (somme des populations)
   - Votants totaux
   - Participation globale (%)
   - Nombre total de bureaux

---

## 🔄 Support de Multiples Formats de Code

L'endpoint supporte **deux formats** de code commune pour plus de flexibilité :

### Format 1 : Code court (recommandé)
```http
GET /api/publications/communes/004/data  # Uniquement le code de la commune
```

### Format 2 : Code complet (également supporté)
```http
GET /api/publications/communes/022-004/data  # Format complet département-commune
```

**Logique de parsing** :
```typescript
// Si le code contient un tiret, extraire la partie après le tiret
const communeCode = codeCommune.includes('-') 
  ? codeCommune.split('-')[1]  // "022-004" → "004"
  : codeCommune;                // "004" → "004"
```

✅ **Les deux formats sont équivalents** et retournent les mêmes données.

---

## 📊 Exemples d'Appels

### Exemple 1 : COCODY (022-004)

```http
# Format court (recommandé)
GET /api/publications/communes/004/data
Authorization: Bearer <token>

# Format complet (également supporté)
GET /api/publications/communes/022-004/data
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "departments": [
    {
      "codeDepartement": "022-004",
      "libelleDepartement": "ABIDJAN - COCODY",
      "inscrits": 187500,
      "votants": 112500,
      "participation": 60.0,
      "nombreBureaux": 52,
      "cels": [
        {
          "codeCellule": "C016",
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
          "codeCellule": "C017",
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

### Exemple 2 : YOPOUGON (022-010)

```http
# Format court
GET /api/publications/communes/010/data
Authorization: Bearer <token>

# Format complet
GET /api/publications/communes/022-010/data
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "departments": [
    {
      "codeDepartement": "022-010",
      "libelleDepartement": "ABIDJAN - YOPOUGON",
      "inscrits": 325000,
      "votants": 195000,
      "participation": 60.0,
      "nombreBureaux": 98,
      "cels": [
        // ... 12 CELs de YOPOUGON
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Exemple 3 : BROFODOUME (022-098) - 1 seule CEL

```http
# Format court
GET /api/publications/communes/098/data
Authorization: Bearer <token>

# Format complet
GET /api/publications/communes/022-098/data
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "departments": [
    {
      "codeDepartement": "022-098",
      "libelleDepartement": "ABIDJAN - BROFODOUME",
      "inscrits": 12500,
      "votants": 7500,
      "participation": 60.0,
      "nombreBureaux": 3,
      "cels": [
        {
          "codeCellule": "C089",
          "libelleCellule": "CEC BROFODOUME",
          "populationTotale": 12500,
          "totalVotants": 7500,
          "nombreBureaux": 3,
          // ... autres champs
        }
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

## 🔒 Sécurité et Permissions

### Rôles Autorisés
- ✅ **SADMIN** : Toutes les communes
- ✅ **ADMIN** : Toutes les communes
- ✅ **USER** : Seulement les communes assignées

### Authentification
- ✅ JWT Bearer Token requis
- ✅ Validation automatique via `JwtAuthGuard`
- ✅ Vérification des rôles via `RolesGuard`

### Filtrage par Rôle
```typescript
// Pour USER : seulement les communes assignées
if (userRole === 'USER' && userId) {
  communeWhere.numeroUtilisateur = userId;
}
// Pour ADMIN et SADMIN : toutes les communes (pas de filtre)
```

---

## 📊 Query Parameters

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | number | Non | 1 | Numéro de page |
| `limit` | number | Non | 10 | Éléments par page |
| `search` | string | Non | - | Recherche dans libellé |

---

## 🔍 Différences avec l'Endpoint Départements

| Critère | Départements (`/departments/:code/data`) | Communes (`/communes/:code/data`) |
|---------|----------------------------------------|----------------------------------|
| **Table source** | `TblDept` | `TblCom` |
| **Code** | Simple (ex: `001`) | Simple (ex: `004`) |
| **Format retour** | `{ codeDepartement: "001", libelleDepartement: "AGBOVILLE" }` | `{ codeDepartement: "022-004", libelleDepartement: "ABIDJAN - COCODY" }` |
| **Filtrage CELs** | Par `codeDepartement` uniquement | Par `codeDepartement` ET `codeCommune` |
| **CELs incluses** | Toutes les CELs du département | Toutes les CELs de la commune |

> **Note** : Le champ `codeDepartement` dans la réponse des communes est formaté comme `"022-004"` pour maintenir la cohérence avec le format utilisé côté frontend.

---

## ✅ Checklist d'Implémentation

- [x] Endpoint créé dans `publication.controller.ts`
- [x] Méthode `getCommuneData()` dans `publication.service.ts`
- [x] Authentification JWT requise
- [x] Contrôle des rôles (SADMIN, ADMIN, USER)
- [x] Filtrage par utilisateur pour rôle USER
- [x] Agrégation des données par CEL
- [x] Calcul des métriques de la commune
- [x] Support de la pagination
- [x] Support de la recherche
- [x] Format de réponse compatible avec le DTO existant

---

## 🧪 Tests à Effectuer

### Test 1 : Commune avec plusieurs CELs
```http
GET /api/publications/communes/004/data
```
**Attendu** : Liste des 7 CELs de COCODY avec données agrégées

### Test 2 : Commune avec une seule CEL
```http
GET /api/publications/communes/098/data
```
**Attendu** : 1 CEL de BROFODOUME avec données

### Test 3 : Commune avec beaucoup de CELs
```http
GET /api/publications/communes/010/data
```
**Attendu** : Liste des 12 CELs de YOPOUGON

### Test 4 : Utilisateur USER (permissions limitées)
```http
GET /api/publications/communes/004/data
Authorization: Bearer <user_token>
```
**Attendu** : 
- Si commune assignée → données retournées
- Si commune non assignée → tableau vide

### Test 5 : Recherche
```http
GET /api/publications/communes/004/data?search=COCODY
```
**Attendu** : Filtre sur le libellé de la commune

### Test 6 : Pagination
```http
GET /api/publications/communes/004/data?page=1&limit=5
```
**Attendu** : Pagination fonctionnelle

---

## 🎯 Intégration Frontend

### Code Frontend - Option 1 (Recommandé)

```typescript
// Détecter si c'est une commune ou un département
const isCommune = entity.code.includes('-');

const endpoint = isCommune 
  ? `/publications/communes/${entity.code.split('-')[1]}/data`  // "022-004" → "004"
  : `/publications/departments/${entity.code}/data`;           // "001" → "001"

const data = await apiClient.get(endpoint);
```

**Exemple** :
- Département AGBOVILLE (`code: "001"`) → `GET /api/publications/departments/001/data`
- Commune COCODY (`code: "022-004"`) → `GET /api/publications/communes/004/data`

### Code Frontend - Option 2 (Plus Simple)

```typescript
// Le backend supporte maintenant le format complet !
const isCommune = entity.code.includes('-');

const endpoint = isCommune 
  ? `/publications/communes/${entity.code}/data`    // "022-004" → directement supporté
  : `/publications/departments/${entity.code}/data`; // "001" → inchangé

const data = await apiClient.get(endpoint);
```

**Exemple** :
- Département AGBOVILLE (`code: "001"`) → `GET /api/publications/departments/001/data`
- Commune COCODY (`code: "022-004"`) → `GET /api/publications/communes/022-004/data` ✅

✨ **Avantage** : Pas besoin de parser le code côté frontend, le backend le fait automatiquement !

---

## 🐛 Erreurs Possibles

### Erreur 404 - Commune non trouvée
```json
{
  "statusCode": 404,
  "message": "Commune 004 non trouvée",
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

## 📚 Documentation Associée

- **[MEMO_BACKEND_ENDPOINT_COMMUNES_DATA.md](./MEMO_BACKEND_ENDPOINT_COMMUNES_DATA.md)** - Demande initiale
- **[TEST_ENDPOINTS_COMMUNES.md](./TEST_ENDPOINTS_COMMUNES.md)** - Tests à effectuer
- **[API_ENDPOINTS_PUBLICATION_COMPLETE.md](./API_ENDPOINTS_PUBLICATION_COMPLETE.md)** - Documentation complète de l'API

---

## ✨ Résumé

✅ **Endpoint créé** : `GET /api/publications/communes/:codeCommune/data`  
✅ **Authentification** : JWT Bearer Token requis  
✅ **Rôles** : SADMIN, ADMIN, USER  
✅ **Pagination** : Supportée  
✅ **Recherche** : Supportée  
✅ **Format** : Compatible avec `DepartmentDataResponse`  

🎉 **L'endpoint est prêt à être testé par le frontend !**

---

**Dernière mise à jour** : 21 octobre 2025  
**Version** : 1.0

