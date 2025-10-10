# Filtres par Région et Département - API Upload

## 📋 Vue d'ensemble

L'endpoint `/upload/imports` a été enrichi pour permettre au frontend de filtrer les imports par région et/ou département, et pour retourner les informations géographiques de chaque CEL.

---

## 🎯 Modifications apportées

### 1. Nouveaux paramètres de requête

L'endpoint `GET /upload/imports` accepte maintenant deux nouveaux paramètres optionnels :

- **`codeRegion`** (string, optionnel) : Filtre les CELs par code région
- **`codeDepartement`** (string, optionnel) : Filtre les CELs par code département

### 2. Informations géographiques dans la réponse

Chaque objet d'import dans la réponse contient maintenant :

```typescript
{
  id: string;
  codeCellule: string;
  nomFichier: string;
  statutImport: ImportStatus;
  // ... autres champs existants
  
  // ✨ NOUVEAU : Informations de département
  departement?: {
    codeDepartement: string;
    libelleDepartement: string;
  };
  
  // ✨ NOUVEAU : Informations de région
  region?: {
    codeRegion: string;
    libelleRegion: string;
  };
}
```

---

## 🔌 Utilisation de l'API

### Exemple 1 : Récupérer toutes les CELs importées

```http
GET /upload/imports?page=1&limit=10
```

**Réponse :**

```json
{
  "imports": [
    {
      "id": "clxxx123...",
      "codeCellule": "CEL001",
      "nomFichier": "Cellule Abidjan Nord",
      "statutImport": "COMPLETED",
      "dateImport": "2025-10-10T10:30:00.000Z",
      "nombreLignesImportees": 50,
      "nombreLignesEnErreur": 0,
      "nombreBureauxVote": 50,
      "departement": {
        "codeDepartement": "001",
        "libelleDepartement": "Abidjan"
      },
      "region": {
        "codeRegion": "R01",
        "libelleRegion": "District Autonome d'Abidjan"
      },
      "details": { ... }
    },
    // ... autres CELs
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### Exemple 2 : Filtrer par région

```http
GET /upload/imports?page=1&limit=10&codeRegion=R01
```

Retourne uniquement les CELs dont les lieux de vote appartiennent à la région `R01`.

### Exemple 3 : Filtrer par département

```http
GET /upload/imports?page=1&limit=10&codeDepartement=001
```

Retourne uniquement les CELs dont les lieux de vote appartiennent au département `001`.

### Exemple 4 : Combiner plusieurs filtres

```http
GET /upload/imports?page=1&limit=20&codeDepartement=001&codeCellule=CEL001
```

**Note :** Si `codeDepartement` et `codeRegion` sont tous deux spécifiés, le filtre par département est prioritaire.

---

## 💡 Cas d'usage Frontend

### 1. Affichage avec filtres

```typescript
// Composant React/Next.js
const [filters, setFilters] = useState({
  page: 1,
  limit: 10,
  codeRegion: '',
  codeDepartement: ''
});

const fetchImports = async () => {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    ...(filters.codeRegion && { codeRegion: filters.codeRegion }),
    ...(filters.codeDepartement && { codeDepartement: filters.codeDepartement })
  });
  
  const response = await fetch(`/api/upload/imports?${params}`);
  const data = await response.json();
  return data;
};
```

### 2. Interface de filtrage

```jsx
<div className="filters">
  <select 
    value={filters.codeRegion}
    onChange={(e) => setFilters({ ...filters, codeRegion: e.target.value })}
  >
    <option value="">Toutes les régions</option>
    <option value="R01">District Autonome d'Abidjan</option>
    <option value="R02">Région du Bas-Sassandra</option>
    {/* ... autres régions */}
  </select>
  
  <select 
    value={filters.codeDepartement}
    onChange={(e) => setFilters({ ...filters, codeDepartement: e.target.value })}
  >
    <option value="">Tous les départements</option>
    <option value="001">Abidjan</option>
    <option value="002">Agnéby-Tiassa</option>
    {/* ... autres départements */}
  </select>
</div>
```

### 3. Affichage des informations géographiques

```jsx
<div className="cel-card">
  <h3>{import.nomFichier}</h3>
  <div className="geo-info">
    <span className="badge region">
      {import.region?.libelleRegion}
    </span>
    <span className="badge departement">
      {import.departement?.libelleDepartement}
    </span>
  </div>
  <div className="stats">
    <span>Bureaux de vote : {import.nombreBureauxVote}</span>
    <span>Statut : {import.statutImport}</span>
  </div>
</div>
```

---

## 🔐 Contrôle d'accès

### Rôle USER

- **Avant** : Voit uniquement les CELs des départements qui lui sont attribués
- **Après** : Même comportement, mais peut filtrer davantage par région/département parmi ses départements attribués

### Rôles ADMIN et SADMIN

- **Avant** : Voient toutes les CELs
- **Après** : Peuvent filtrer par région/département pour affiner la vue

---

## 📊 Logique de filtrage

### Priorité des filtres

1. **Filtres géographiques** : `codeDepartement` > `codeRegion`
2. **Filtres de rôle** : Les filtres utilisateur (rôle USER) sont appliqués en premier
3. **Filtres additionnels** : `codeCellule` peut être combiné avec les filtres géographiques

### Relations dans la base de données

```
TblCel → TblLv → TblDept → TblReg
  ↓        ↓        ↓         ↓
CEL   LieuVote  Département Région
```

- Une CEL peut avoir plusieurs lieux de vote
- Les informations de département et région sont extraites du **premier lieu de vote** de la CEL
- Le filtrage se fait via la relation `lieuxVote.some` pour trouver toutes les CELs ayant au moins un lieu de vote correspondant

---

## 🧪 Tests recommandés pour le Frontend

### Test 1 : Filtrage par région

1. Sélectionner une région dans le filtre
2. Vérifier que tous les imports affichés appartiennent à cette région
3. Vérifier que le badge de région est correct

### Test 2 : Filtrage par département

1. Sélectionner un département dans le filtre
2. Vérifier que tous les imports affichés appartiennent à ce département
3. Vérifier que les badges de région et département sont cohérents

### Test 3 : Réinitialisation des filtres

1. Appliquer un filtre région
2. Le retirer
3. Vérifier que toutes les CELs réapparaissent

### Test 4 : Combinaison de filtres

1. Appliquer un filtre région
2. Ajouter un filtre département (doit être dans la région)
3. Vérifier que les résultats sont correctement filtrés

### Test 5 : Permissions utilisateur (rôle USER)

1. Se connecter avec un utilisateur de rôle USER
2. Vérifier qu'il ne voit que les CELs de ses départements attribués
3. Appliquer des filtres région/département
4. Vérifier que les filtres sont restreints à ses départements

---

## 📝 Notes techniques

### Performance

- Les requêtes incluent maintenant des jointures avec `TblLv`, `TblDept` et `TblReg`
- Pour optimiser, seulement le **premier lieu de vote** est récupéré (`take: 1`)
- Les index existants sur les tables devraient assurer de bonnes performances

### Cas particuliers

- **CEL sans lieu de vote** : `departement` et `region` seront `undefined`
- **CEL multi-départements** : Seul le département du premier lieu de vote est retourné
- **Filtres vides** : Si `codeRegion` ou `codeDepartement` est une chaîne vide, le filtre n'est pas appliqué

---

## 🔄 Rétrocompatibilité

- ✅ Les anciens appels sans les nouveaux paramètres fonctionnent toujours
- ✅ Les champs `departement` et `region` sont optionnels dans la réponse
- ✅ Les endpoints existants restent inchangés

---

## 📞 Support

Pour toute question ou problème concernant ces modifications, consultez :

- Le code source : `src/upload/upload.service.ts` (fonction `getImports`)
- Le contrôleur : `src/upload/upload.controller.ts`
- Les DTOs : `src/upload/dto/upload-excel.dto.ts`

---

**Dernière mise à jour** : 10 octobre 2025
**Version** : 1.0.0

