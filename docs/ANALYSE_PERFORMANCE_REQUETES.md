# Analyse Performance : Requêtes Lentes

**Date** : 2025-10-09  
**Problème** : Requêtes SQL lentes détectées (>1000ms)

---

## 🐌 REQUÊTE LENTE DÉTECTÉE

### Requête problématique
```sql
SELECT [dbo].[TBL_CEL].* 
FROM [dbo].[TBL_CEL] 
WHERE EXISTS(
  SELECT [t].[COD_CEL] 
  FROM [dbo].[TBL_LV] AS [t] 
  LEFT JOIN [dbo].[TBL_DEPT] AS [j] ON ([j].[COD_DEPT] = [t].[COD_DEPT]) 
  WHERE [j].[COD_DEPT] = @P 
    AND [j].[id] IS NOT NULL 
    AND [dbo].[TBL_CEL].[COD_CEL] = [t].[COD_CEL]
    AND [t].[COD_CEL] IS NOT NULL
)
```

**Temps d'exécution** : 1255ms (trop lent !)

---

## 🔍 CAUSE DU PROBLÈME

### Méthode actuelle dans `getDepartments()`

Pour afficher 10 entités (1 département + 9 communes), le code fait :

1. **1 requête** : Récupérer les départements (rapide)
2. **1 requête** : Récupérer les communes d'Abidjan (rapide)
3. **Pour CHAQUE département** : Requête CELs (LENTE - 1255ms × nombre de départements)
4. **Pour CHAQUE commune** : Requête CELs (14 requêtes)

**Total pour page 1 (10 entités)** :
- 1 département → 1 requête lente (1255ms)
- 9 communes → 9 requêtes (~100ms chacune)
- **TOTAL : ~2200ms (2.2 secondes) pour une seule page !**

---

## ⚡ SOLUTIONS D'OPTIMISATION

### Solution 1 : Simplifier la requête CELs (RAPIDE) ⭐

**Problème** : La requête Prisma avec `EXISTS` et `LEFT JOIN` est trop complexe

**Solution** : Utiliser une requête SQL directe plus simple

```typescript
// AU LIEU DE (LENT)
const cels = await this.prisma.tblCel.findMany({
  where: { 
    lieuxVote: {
      some: {
        departement: {
          codeDepartement: dept.codeDepartement
        }
      }
    }
  }
});

// UTILISER (RAPIDE)
const cels = await this.prisma.$queryRaw`
  SELECT DISTINCT 
    c.COD_CEL,
    c.LIB_CEL,
    c.ETA_RESULTAT_CEL
  FROM TBL_CEL c
  INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL
  WHERE lv.COD_DEPT = ${dept.codeDepartement}
`;
```

**Gain estimé** : 1255ms → ~50ms (95% plus rapide)

---

### Solution 2 : Batch les requêtes CELs (MOYEN)

Au lieu de faire N requêtes séquentielles, faire 1 seule requête pour TOUS :

```typescript
// Récupérer TOUTES les CELs de TOUS les départements/communes en UNE FOIS
const allCodes = [
  ...departements.map(d => d.codeDepartement),
  ...communes.map(c => `022-${c.codeCommune}`)
];

const allCels = await this.prisma.$queryRaw`
  SELECT 
    lv.COD_DEPT,
    c.COD_CEL,
    c.LIB_CEL,
    c.ETA_RESULTAT_CEL
  FROM TBL_CEL c
  INNER JOIN TBL_LV lv ON c.COD_CEL = lv.COD_CEL
  WHERE lv.COD_DEPT IN (${allCodes.join(',')})
`;

// Puis grouper en mémoire par département/commune
```

**Gain estimé** : 10 requêtes × 1000ms → 1 requête × 200ms (98% plus rapide)

---

### Solution 3 : Pagination lazy (FACILE)

Ne charger les CELs que pour les entités affichées (pas toutes) :

```typescript
// Option : Ne pas inclure les CELs dans la liste
// Les charger seulement dans les détails

return {
  id: dept.id,
  code: dept.codeDepartement,
  libelle: dept.libelleDepartement,
  type: 'DEPARTMENT',
  totalCels: 0,  // À calculer en lazy
  importedCels: 0,
  pendingCels: 0,
  cels: []  // Vide dans la liste, chargé dans les détails
};
```

**Gain estimé** : Pas de requêtes CELs → Instantané

---

### Solution 4 : Ajouter des index SQL (RECOMMANDÉ)

```sql
-- Index pour accélérer les jointures
CREATE INDEX IDX_TBL_LV_COD_DEPT_COD_CEL 
ON TBL_LV (COD_DEPT, COD_CEL);

CREATE INDEX IDX_TBL_LV_COD_CEL 
ON TBL_LV (COD_CEL);

CREATE INDEX IDX_TBL_CEL_COD_CEL 
ON TBL_CEL (COD_CEL);
```

**Gain estimé** : 1255ms → ~100ms (92% plus rapide)

---

## 🎯 RECOMMANDATION IMMÉDIATE

### Action 1 : Optimiser la méthode getDepartments()

Combiner **Solution 1 + Solution 4** :
1. Remplacer les requêtes Prisma complexes par des requêtes SQL simples
2. Ajouter des index SQL

**Impact** :
- Temps de réponse : 2200ms → ~200ms (91% plus rapide)
- Expérience utilisateur : ✅ Instantané

### Action 2 : Si besoin de plus d'optimisation

Ajouter la **Solution 2** (batch des requêtes) pour passer de ~200ms à ~50ms.

---

## 📝 Quelle solution voulez-vous implémenter ?

**Je recommande de commencer par la Solution 1** (remplacer les requêtes Prisma par des requêtes SQL directes) car :
- ✅ Rapide à implémenter (~10 minutes)
- ✅ Gain énorme (95% plus rapide)
- ✅ Pas de risque
- ✅ Pas besoin de modifier la base de données

**Voulez-vous que j'implémente cette optimisation maintenant ?** 🚀

