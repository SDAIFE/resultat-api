# Checklist de Déploiement - Publication Communes Abidjan

## ✅ Vérifications avant déploiement

### 1. Base de données

- [ ] **Vérifier que les colonnes sont ajoutées à TBL_COM**
  ```bash
  npx ts-node scripts/check-tblcom-columns.ts
  ```
  Colonnes attendues : `NUM_UTIL`, `STAT_PUB`

- [ ] **Vérifier que la table COMMUNE_PUBLICATION_HISTORY existe**
  ```sql
  SELECT * FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_NAME = 'COMMUNE_PUBLICATION_HISTORY'
  ```

- [ ] **Vérifier les foreign keys**
  ```sql
  SELECT * FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_NAME LIKE '%COMMUNE%'
  ```

### 2. Code Backend

- [x] **Compilation sans erreurs**
  ```bash
  npm run build
  ```
  Status : ✅ Réussi

- [x] **Aucune erreur de linter**
  ```bash
  npm run lint
  ```
  Status : ✅ Aucune erreur

- [x] **Tests passent**
  ```bash
  npx ts-node scripts/test-abidjan-publication.ts
  npx ts-node scripts/test-communes-publication-complete.ts
  ```
  Status : ✅ 14/14 tests passent (100%)

### 3. Fichiers modifiés

- [x] `prisma/schema.prisma` - Modèles TblCom et CommunePublicationHistory
- [x] `src/publication/dto/publication-response.dto.ts` - DTOs pour communes
- [x] `src/publication/publication.service.ts` - Logique métier
- [x] `src/publication/publication.controller.ts` - Endpoints API

### 4. Documentation créée

- [x] `docs/IMPLEMENTATION_ABIDJAN_COMMUNES.md` - Doc technique
- [x] `docs/GUIDE_FRONTEND_ABIDJAN_COMMUNES.md` - Guide frontend
- [x] `docs/EXEMPLE_RETOUR_getDepartmentsData.md` - Exemples API
- [x] `docs/API_ENDPOINTS_PUBLICATION_COMPLETE.md` - Liste des endpoints
- [x] `docs/RESUME_IMPLEMENTATION_ABIDJAN.md` - Résumé global
- [x] `docs/CHECKLIST_DEPLOIEMENT.md` - Ce fichier

---

## 🚀 Procédure de déploiement

### Étape 1 : Préparer la base de données (Production)

```bash
# 1. Sauvegarder la base de données
# (Créer un backup avant toute modification)

# 2. Appliquer les changements du schéma
npx prisma db push --accept-data-loss

# OU exécuter le script SQL manuellement
# scripts/add-commune-columns.sql
```

### Étape 2 : Déployer le backend

```bash
# 1. Pull les dernières modifications
git pull origin master

# 2. Installer les dépendances
npm install

# 3. Regénérer le client Prisma
npx prisma generate

# 4. Compiler
npm run build

# 5. Redémarrer l'application
pm2 restart resultat-api
# OU
npm run start:prod
```

### Étape 3 : Vérifier le déploiement

```bash
# 1. Vérifier que l'API démarre sans erreur
curl http://localhost:3000/api/publications/stats

# 2. Vérifier les communes d'Abidjan
curl http://localhost:3000/api/publications/departments?codeDepartement=022

# Attendu : 14 communes retournées
```

### Étape 4 : Tester en production

- [ ] Connexion avec un compte ADMIN
- [ ] Vérifier que les 14 communes d'Abidjan apparaissent
- [ ] Vérifier que le département Abidjan (022) n'apparaît PAS
- [ ] Tester la recherche (ex: "COCODY")
- [ ] Tester la pagination
- [ ] Tester la publication d'une commune (si CELs importées)

---

## 🔍 Tests post-déploiement

### Test 1 : Statistiques

```bash
curl -X GET "http://localhost:3000/api/publications/stats" \
  -H "Authorization: Bearer {token}"

# Vérifier : totalDepartments devrait être ~125
```

### Test 2 : Liste complète

```bash
curl -X GET "http://localhost:3000/api/publications/departments?page=1&limit=150" \
  -H "Authorization: Bearer {token}"

# Vérifier : 
# - total = 125
# - 111 entités avec type "DEPARTMENT"
# - 14 entités avec type "COMMUNE" et libelle commençant par "ABIDJAN -"
```

### Test 3 : Filtrer Abidjan

```bash
curl -X GET "http://localhost:3000/api/publications/departments?codeDepartement=022" \
  -H "Authorization: Bearer {token}"

# Vérifier : 
# - total = 14
# - Toutes les entités sont de type "COMMUNE"
```

### Test 4 : Recherche

```bash
curl -X GET "http://localhost:3000/api/publications/departments?search=COCODY" \
  -H "Authorization: Bearer {token}"

# Vérifier : 
# - Retourne "ABIDJAN - COCODY" avec type "COMMUNE"
```

### Test 5 : Blocage publication Abidjan

```bash
# Récupérer l'ID du département Abidjan dans la base
# Puis tenter de le publier
curl -X POST "http://localhost:3000/api/publications/departments/{abidjanId}/publish" \
  -H "Authorization: Bearer {token}"

# Vérifier : 
# - Status code 400
# - Message : "Abidjan ne peut pas être publié globalement..."
```

### Test 6 : Publication d'une commune (si CELs importées)

```bash
# Récupérer l'ID d'une commune (ex: COCODY)
curl -X POST "http://localhost:3000/api/publications/communes/{cocodyId}/publish" \
  -H "Authorization: Bearer {token}"

# Vérifier : 
# - Status code 200 (si toutes CELs importées)
# - OU Status code 400 (si CELs en attente) avec message clair
```

---

## 🗂️ Scripts de maintenance

### Afficher les communes d'Abidjan
```bash
npx ts-node scripts/show-abidjan-communes.ts
```

### Vérifier les colonnes TblCom
```bash
npx ts-node scripts/check-tblcom-columns.ts
```

### Tests complets
```bash
npx ts-node scripts/test-abidjan-publication.ts
npx ts-node scripts/test-communes-publication-complete.ts
```

---

## 📊 Métriques attendues

| Métrique | Valeur attendue |
|----------|-----------------|
| Total d'entités dans getDepartments() | 125 |
| Départements standards | 111 |
| Communes d'Abidjan | 14 |
| Total CELs Abidjan | 106 |
| Endpoints API ajoutés | 3 |

---

## ⚠️ Points d'attention

### 1. Migration de données existantes

Si des utilisateurs étaient assignés au département Abidjan (022) :
```sql
-- Les réassigner à des communes spécifiques
UPDATE TBL_COM 
SET NUM_UTIL = (SELECT NUM_UTIL FROM TBL_DEPT WHERE COD_DEPT = '022')
WHERE COD_DEPT = '022';
```

### 2. Statuts de publication initiaux

Les communes d'Abidjan n'ont pas de statut par défaut :
```sql
-- Initialiser tous les statuts à PENDING
UPDATE TBL_COM 
SET STAT_PUB = 'PENDING'
WHERE COD_DEPT = '022' AND STAT_PUB IS NULL;
```

### 3. Performance

Si la performance devient un problème (>50ms pour getDepartments) :
- Envisager de créer une vue SQL avec les colonnes communes
- Ajouter des index sur TBL_COM.STAT_PUB et NUM_UTIL

### 4. Frontend

Le frontend devra :
- Gérer le nouveau type `PublishableEntity`
- Utiliser les endpoints `/communes/*` pour Abidjan
- Afficher visuellement la différence département/commune

---

## 🔄 Rollback (si nécessaire)

### Si problème critique après déploiement

1. **Rollback du code**
   ```bash
   git revert HEAD
   npm run build
   pm2 restart resultat-api
   ```

2. **Rollback de la base (optionnel)**
   ```sql
   -- Retirer les colonnes ajoutées
   ALTER TABLE TBL_COM DROP COLUMN NUM_UTIL;
   ALTER TABLE TBL_COM DROP COLUMN STAT_PUB;
   
   -- Supprimer la table d'historique
   DROP TABLE COMMUNE_PUBLICATION_HISTORY;
   ```

3. **Restaurer le backup de la base de données**

---

## 📞 Support

En cas de problème :
1. Vérifier les logs de l'application
2. Vérifier les tests : `npx ts-node scripts/test-abidjan-publication.ts`
3. Vérifier la structure de la base : `scripts/check-tblcom-columns.ts`
4. Consulter la documentation : `docs/IMPLEMENTATION_ABIDJAN_COMMUNES.md`

---

**Date de création** : 2025-10-09  
**Créé par** : Équipe Backend NestJS  
**Version** : 1.0.0

