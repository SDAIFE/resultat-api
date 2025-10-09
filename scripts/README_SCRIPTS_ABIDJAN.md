# Scripts - Gestion des Communes d'Abidjan

Ce dossier contient les scripts de test, analyse et maintenance pour la fonctionnalité de publication par communes d'Abidjan.

---

## 🧪 Scripts de test

### `test-abidjan-publication.ts` ⭐ **PRINCIPAL**

**Description** : Tests principaux de la fonctionnalité Abidjan

**Utilité** : Valider que l'implémentation fonctionne correctement

**Tests effectués** :
- ✅ getStats() retourne 125 entités
- ✅ 14 communes d'Abidjan dans la liste
- ✅ Département Abidjan (022) absent
- ✅ Pagination fonctionnelle
- ✅ Recherche fonctionnelle
- ✅ Filtre par département

**Exécution** :
```bash
npx ts-node scripts/test-abidjan-publication.ts
```

**Quand l'utiliser** :
- Après chaque modification du code
- Avant un déploiement
- Pour valider la régression

---

### `test-communes-publication-complete.ts` ⭐ **COMPLET**

**Description** : Tests complets de toutes les fonctionnalités communes

**Tests effectués** :
- ✅ Récupération des 14 communes
- ✅ getCommuneDetails() fonctionne
- ✅ Blocage de publication d'Abidjan global
- ✅ Validation des méthodes publishCommune et cancelCommune
- ✅ getStats() avec communes
- ✅ Recherche et pagination

**Exécution** :
```bash
npx ts-node scripts/test-communes-publication-complete.ts
```

---

## 🔍 Scripts d'analyse

### `show-abidjan-communes.ts`

**Description** : Affiche la liste des 14 communes d'Abidjan avec leurs CELs

**Utilité** : 
- Debug rapide
- Vérifier les communes existantes
- Voir le nombre de CELs par commune

**Exécution** :
```bash
npx ts-node scripts/show-abidjan-communes.ts
```

**Output** :
```
1. ABIDJAN - ABOBO (16 CELs)
2. ABIDJAN - COCODY (7 CELs)
...
14. ABIDJAN - YOPOUGON (12 CELs)
```

---

### `check-tblcom-columns.ts`

**Description** : Vérifie que les colonnes nécessaires existent dans TBL_COM

**Utilité** : 
- Valider que la migration a réussi
- Debug des problèmes de schéma

**Exécution** :
```bash
npx ts-node scripts/check-tblcom-columns.ts
```

**Vérifications** :
- ✅ Colonne `STAT_PUB` présente
- ✅ Colonne `NUM_UTIL` présente
- Affiche la structure complète de TBL_COM

---

### `check-missing-cels.ts`

**Description** : Vérifie les CELs des communes manquantes (BINGERVILLE, BROFODOUME, SONGON)

**Utilité** : 
- Debug si des communes n'apparaissent pas
- Vérifier les liens TBL_LV → TBL_CEL

**Exécution** :
```bash
npx ts-node scripts/check-missing-cels.ts
```

---

### `investigate-missing-communes.ts`

**Description** : Investigation approfondie des communes manquantes

**Utilité** : 
- Analyse des problèmes de données
- Vérifier les relations entre tables

**Exécution** :
```bash
npx ts-node scripts/investigate-missing-communes.ts
```

---

## 📊 Scripts d'analyse de la vue SQL

### `analyze-view-liste-cel-departement.ts`

**Description** : Analyse la vue View_Liste_Cel_Par_Departement

**Utilité** : 
- Comprendre la structure de la vue
- Identifier les départements multi-communes

**Exécution** :
```bash
npx ts-node scripts/analyze-view-liste-cel-departement.ts
```

---

### `test-vue-current-structure.ts`

**Description** : Teste la structure actuelle de la vue et propose des améliorations

**Utilité** : 
- Documenter les limitations de la vue
- Proposer des améliorations SQL

**Exécution** :
```bash
npx ts-node scripts/test-vue-current-structure.ts
```

---

### `test-vue-updated.ts`

**Description** : Teste une version modifiée de la vue (avec colonnes communes)

**Utilité** : 
- Valider les modifications de vue
- Comparer avec l'approche actuelle

**Exécution** :
```bash
npx ts-node scripts/test-vue-updated.ts
```

---

## 🗄️ Scripts SQL

### `add-commune-columns.sql`

**Description** : Script SQL pour ajouter manuellement les colonnes à TBL_COM

**Utilité** : 
- Alternative à `npx prisma db push`
- Migration manuelle en production

**Contenu** :
- Ajout de `NUM_UTIL` à TBL_COM
- Ajout de `STAT_PUB` à TBL_COM
- Création de `COMMUNE_PUBLICATION_HISTORY`
- Ajout des foreign keys

**Note** : ⚠️ À exécuter uniquement si `npx prisma db push` ne fonctionne pas

---

## 📋 Ordre d'exécution recommandé

### Lors de la première installation

```bash
# 1. Vérifier la structure de TBL_COM
npx ts-node scripts/check-tblcom-columns.ts

# 2. Afficher les communes d'Abidjan
npx ts-node scripts/show-abidjan-communes.ts

# 3. Exécuter les tests principaux
npx ts-node scripts/test-abidjan-publication.ts

# 4. Si tout est OK, tests complets
npx ts-node scripts/test-communes-publication-complete.ts
```

### Après chaque modification

```bash
# Tests de régression
npx ts-node scripts/test-abidjan-publication.ts
```

### En cas de problème

```bash
# 1. Vérifier les colonnes
npx ts-node scripts/check-tblcom-columns.ts

# 2. Vérifier les communes
npx ts-node scripts/show-abidjan-communes.ts

# 3. Investiguer les communes manquantes
npx ts-node scripts/investigate-missing-communes.ts

# 4. Vérifier les CELs
npx ts-node scripts/check-missing-cels.ts
```

---

## 🗑️ Scripts à conserver ou supprimer

### ✅ À CONSERVER (importants)

- `test-abidjan-publication.ts` - Tests de régression
- `test-communes-publication-complete.ts` - Tests complets
- `show-abidjan-communes.ts` - Debug rapide
- `check-tblcom-columns.ts` - Vérification schéma

### ⚠️ OPTIONNELS (analyse)

Ces scripts ont servi pour l'analyse initiale, vous pouvez les supprimer si l'espace disque est limité :
- `analyze-view-liste-cel-departement.ts`
- `investigate-missing-communes.ts`
- `check-missing-cels.ts`
- `test-vue-current-structure.ts`
- `test-vue-updated.ts`

**Commande de nettoyage** :
```bash
# Windows PowerShell
Remove-Item scripts/analyze-view-liste-cel-departement.ts
Remove-Item scripts/investigate-missing-communes.ts
Remove-Item scripts/check-missing-cels.ts
Remove-Item scripts/test-vue-current-structure.ts
Remove-Item scripts/test-vue-updated.ts

# Linux/Mac
rm scripts/analyze-view-liste-cel-departement.ts
rm scripts/investigate-missing-communes.ts
rm scripts/check-missing-cels.ts
rm scripts/test-vue-current-structure.ts
rm scripts/test-vue-updated.ts
```

---

## 📄 Exemple de sortie

### test-abidjan-publication.ts

```
================================================================================
TEST : Publication Abidjan (Communes)
================================================================================

📊 TEST 1 : getStats()
✅ SUCCÈS : Total = 125 entités (111 départements + 14 communes Abidjan)

📋 TEST 2 : getDepartments() - Liste complète
✅ SUCCÈS : 14 communes d'Abidjan trouvées dans la liste

🔍 TEST 3 : Vérifier qu'Abidjan (022) n'apparaît pas
✅ SUCCÈS : Le département Abidjan (022) n'apparaît pas

...

================================================================================
📊 RÉSUMÉ DES TESTS
Résultat: 6/6 tests réussis (100%)
================================================================================
```

---

**Maintenu par** : Équipe Backend NestJS  
**Dernière mise à jour** : 2025-10-09

