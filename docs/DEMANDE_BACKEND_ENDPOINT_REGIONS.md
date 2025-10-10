# 🚨 DEMANDE BACKEND - Endpoint Régions Manquant

**Date** : 10 octobre 2025  
**Priorité** : ⚠️ **MOYENNE** (Fonctionnalité dégradée mais non bloquante)  
**Statut** : ✅ **IMPLÉMENTÉ**

---

## 🔍 PROBLÈME

L'endpoint pour récupérer la liste simple des régions **n'existe pas encore** sur le backend.

### Erreur détectée
```
❌ AxiosError: Request failed with status code 404
Endpoint: GET /api/v1/regions/list/simple
```

---

## 📋 ENDPOINT REQUIS

### GET `/api/v1/regions/list/simple`

**Description** : Récupérer la liste simple de toutes les régions

**Réponse attendue** :
```json
[
  {
    "codeRegion": "R01",
    "libelleRegion": "District Autonome d'Abidjan"
  },
  {
    "codeRegion": "R02",
    "libelleRegion": "Région du Bas-Sassandra"
  },
  {
    "codeRegion": "R03",
    "libelleRegion": "Région du Comoé"
  }
]
```

**Type TypeScript (Frontend)** :
```typescript
interface SimpleRegion {
  codeRegion: string;
  libelleRegion: string;
}
```

---

## 🔧 IMPLÉMENTATION SUGGÉRÉE (BACKEND)

### 1. Contrôleur (`regions.controller.ts`)

```typescript
@Get('list/simple')
@ApiOperation({ summary: 'Liste simple des régions' })
@ApiResponse({
  status: 200,
  description: 'Liste des régions (code + libellé)',
  type: [SimpleRegionDto],
})
async getSimpleList(): Promise<SimpleRegionDto[]> {
  return this.regionsService.getSimpleList();
}
```

### 2. Service (`regions.service.ts`)

```typescript
async getSimpleList(): Promise<SimpleRegionDto[]> {
  const regions = await this.prisma.tblReg.findMany({
    select: {
      codeRegion: true,
      libelleRegion: true,
    },
    orderBy: {
      libelleRegion: 'asc',
    },
  });

  return regions;
}
```

### 3. DTO (`simple-region.dto.ts`)

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class SimpleRegionDto {
  @ApiProperty({ example: 'R01' })
  codeRegion: string;

  @ApiProperty({ example: 'District Autonome d\'Abidjan' })
  libelleRegion: string;
}
```

---

## 🔄 COMPORTEMENT ACTUEL DU FRONTEND

### ✅ Gestion de l'erreur implémentée

Le frontend a été configuré pour **tolérer l'absence** de cet endpoint :

```typescript
getRegionsList: async (): Promise<SimpleRegion[]> => {
  try {
    const response = await apiClient.get('/regions/list/simple');
    return response.data;
  } catch (error: any) {
    // Si l'endpoint n'existe pas encore (404), retourner un tableau vide
    if (error.response?.status === 404) {
      console.warn('⚠️ Endpoint /regions/list/simple non disponible (404)');
      return []; // ✅ Pas d'erreur, juste un tableau vide
    }
    throw error;
  }
}
```

**Conséquence** :
- ✅ L'application **continue de fonctionner normalement**
- ⚠️ Le filtre "Région" est **vide** (mais visible)
- ⚠️ Aucune colonne "Région" n'est **remplie** dans le tableau des imports

---

## 🎯 IMPACT

### Sans l'endpoint
- ⚠️ Filtre Région **désactivé** (select vide)
- ⚠️ Colonne Région dans le tableau affiche **"-"** pour tous les imports
- ✅ Le reste de l'application **fonctionne normalement**

### Avec l'endpoint
- ✅ Filtre Région **fonctionnel** avec toutes les régions
- ✅ Colonne Région affiche **le nom de la région** pour chaque import
- ✅ Possibilité de **filtrer les imports par région**

---

## 📊 ENDPOINTS EXISTANTS (pour référence)

| Endpoint | Statut | Description |
|----------|--------|-------------|
| `GET /api/v1/departements/list/simple` | ✅ Existant | Liste des départements |
| `GET /api/v1/cels/list/simple` | ✅ Existant | Liste des CELs |
| `GET /api/v1/regions/list/simple` | ❌ **Manquant** | Liste des régions |

---

## 🔗 RELATION AVEC LES AUTRES ENDPOINTS

### Endpoint `/api/v1/upload/imports`

Cet endpoint **retourne déjà** les informations de région pour chaque import :

```json
{
  "imports": [
    {
      "id": "...",
      "codeCellule": "CEL001",
      "nomFichier": "...",
      "region": {
        "codeRegion": "R01",
        "libelleRegion": "District Autonome d'Abidjan"
      }
    }
  ]
}
```

**Donc**, le backend **a déjà accès** aux données de région via la table `TblReg`.

Il suffit de créer un endpoint simple pour **lister toutes les régions**.

---

## ✅ CHECKLIST IMPLÉMENTATION BACKEND

- [x] Créer le DTO `SimpleRegionDto` ✅
- [x] Ajouter la route `GET /regions/list/simple` dans le contrôleur ✅
- [x] Implémenter la méthode `getSimpleList()` dans le service ✅
- [x] Créer le module complet (controller, service, module) ✅
- [x] Ajouter le module dans app.module.ts ✅
- [ ] Tester l'endpoint avec Postman/Insomnia
- [x] Vérifier que la réponse est bien triée par `libelleRegion` ✅
- [ ] Déployer en production

---

## 🧪 TEST APRÈS IMPLÉMENTATION

### 1. Test API direct

```bash
curl -X GET http://localhost:3001/api/v1/regions/list/simple \
  -H "Authorization: Bearer <token>"
```

**Réponse attendue** :
```json
[
  { "codeRegion": "R01", "libelleRegion": "District Autonome d'Abidjan" },
  { "codeRegion": "R02", "libelleRegion": "Région du Bas-Sassandra" },
  ...
]
```

### 2. Test Frontend

1. Ouvrir `/upload`
2. Vérifier que le select "Région" est **rempli** avec toutes les régions
3. Sélectionner une région
4. Vérifier que les imports sont **filtrés**
5. Vérifier que la colonne "Région" affiche **les noms des régions**

---

## 📝 NOTES

- **Table Prisma** : `TblReg` (déjà existante)
- **Champs requis** : `codeRegion`, `libelleRegion`
- **Tri** : Par ordre alphabétique de `libelleRegion`
- **Permissions** : Accessible à tous les rôles authentifiés (USER, ADMIN, SADMIN)

---

## 📞 CONTACT

Si vous avez des questions sur l'implémentation de cet endpoint, référez-vous à :
- Guide API : `docs/API_FILTRES_REGION_DEPARTEMENT.md`
- Implémentation frontend : `docs/IMPLEMENTATION_FILTRES_REGION_DEPARTEMENT.md`
- Endpoints similaires : `/departements/list/simple`, `/cels/list/simple`

---

**Créé le** : 10 octobre 2025  
**Par** : Équipe Frontend  
**Implémenté le** : 10 octobre 2025  
**Statut** : ✅ **IMPLÉMENTÉ - PRÊT À TESTER**

