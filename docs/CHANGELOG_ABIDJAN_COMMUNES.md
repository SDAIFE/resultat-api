# Changelog - Publication par Communes pour Abidjan

## Version 2.0.0 - 2025-10-09

### 🎯 Nouvelle fonctionnalité majeure

**Publication par communes pour Abidjan**

Au lieu de publier Abidjan comme un seul département, le système permet maintenant de publier chacune des 14 communes d'Abidjan individuellement.

---

### ➕ Ajouts

#### Base de données
- Ajout de la colonne `NUM_UTIL` dans `TBL_COM` (assignation utilisateur à une commune)
- Ajout de la colonne `STAT_PUB` dans `TBL_COM` (statut de publication)
- Création de la table `COMMUNE_PUBLICATION_HISTORY` (historique des publications)
- Ajout des foreign keys pour les relations

#### API - Nouveaux endpoints
- `POST /api/publications/communes/:id/publish` - Publier une commune d'Abidjan
- `POST /api/publications/communes/:id/cancel` - Annuler la publication d'une commune
- `GET /api/publications/communes/:id/details` - Obtenir les détails d'une commune

#### Service - Nouvelles méthodes
- `publishCommune(communeId, userId)` - Publier une commune
- `cancelCommunePublication(communeId, userId)` - Annuler publication
- `getCommuneDetails(communeId)` - Détails d'une commune
- `getAbidjanCommunes()` - Helper privé pour récupérer les 14 communes
- `getCelsForCommune(codeDept, codeCommune)` - Helper privé pour récupérer les CELs

#### DTOs
- `PublishableEntity` - Interface unifiée département/commune
- `CommuneData` - Données d'une commune
- `CommuneDetailsResponse` - Détails avec historique

#### Documentation
- `IMPLEMENTATION_ABIDJAN_COMMUNES.md` - Documentation technique complète
- `GUIDE_FRONTEND_ABIDJAN_COMMUNES.md` - Guide pour le frontend
- `EXEMPLE_RETOUR_getDepartmentsData.md` - Exemples de retours API
- `API_ENDPOINTS_PUBLICATION_COMPLETE.md` - Liste complète des endpoints
- `RESUME_IMPLEMENTATION_ABIDJAN.md` - Résumé de l'implémentation
- `CHECKLIST_DEPLOIEMENT.md` - Checklist pour le déploiement
- `CHANGELOG_ABIDJAN_COMMUNES.md` - Ce fichier

#### Scripts de test et analyse
- `test-abidjan-publication.ts` - Tests principaux (6/6 passent)
- `test-communes-publication-complete.ts` - Tests complets (8/8 passent)
- `show-abidjan-communes.ts` - Affiche les 14 communes
- `check-missing-cels.ts` - Vérifie les CELs manquantes
- `investigate-missing-communes.ts` - Analyse des communes
- `check-tblcom-columns.ts` - Vérifie les colonnes
- `test-vue-current-structure.ts` - Analyse de la vue SQL
- `add-commune-columns.sql` - Script SQL pour migration manuelle

---

### 🔄 Modifications

#### API - Endpoints modifiés

**`GET /api/publications/departments`**
- **AVANT** : Retournait 112 départements
- **MAINTENANT** : Retourne 125 entités (111 départements + 14 communes d'Abidjan)
- **Format** : Nouveau type `PublishableEntity` avec propriété `type`
- **Impact Frontend** : ⚠️ Breaking change - Le type de retour a changé

**`GET /api/publications/stats`**
- **AVANT** : Comptait 112 départements
- **MAINTENANT** : Compte 125 entités (départements + communes)
- **Impact Frontend** : ✅ Pas de breaking change (mêmes champs)

**`POST /api/publications/departments/:id/publish`**
- **AVANT** : Pouvait publier n'importe quel département
- **MAINTENANT** : Refuse de publier Abidjan (code 022)
- **Impact Frontend** : ⚠️ Nouvelle erreur 400 possible pour Abidjan

#### Service - Méthodes modifiées

**`getDepartments()`**
- Maintenant retourne un mix de départements et communes
- Exclut automatiquement le département Abidjan (022)
- Inclut les 14 communes d'Abidjan à la place
- Supporte les filtres : `codeDepartement='022'` → retourne les 14 communes

**`getStats()`**
- Compte séparément départements et communes d'Abidjan
- Totalise pour retourner 125 entités

**`publishDepartment()`**
- Ajoute une vérification : bloque Abidjan (022)
- Lance une `BadRequestException` avec message explicatif

---

### 🗑️ Suppressions

Aucune suppression. Toutes les fonctionnalités existantes sont conservées.

---

### 🔧 Corrections de bugs

#### Bug #1 : Vue SQL incompatible
- **Problème** : La vue `View_Liste_Cel_Par_Departement` ne contenait pas les colonnes communes
- **Solution** : Utilisation de requêtes SQL directes via `$queryRaw`

#### Bug #2 : Syntaxe SQL Server
- **Problème** : Utilisation de `LIMIT` au lieu de `TOP`
- **Solution** : Suppression du LIMIT, utilisation de filtrage direct

#### Bug #3 : Doublons de communes
- **Problème** : Certaines communes ont plusieurs codes dans TblCom (ANYAMA, BINGERVILLE, SONGON)
- **Solution** : Déduplication en mémoire par libellé de commune

#### Bug #4 : Filtrage par codeDepartement
- **Problème** : Quand on filtre par '022', tous les départements étaient retournés
- **Solution** : Condition `if (codeDepartement !== '022')` avant de récupérer les départements

---

## 📊 Impact sur les performances

### Requêtes API

**Avant** :
- `getDepartments()` : 1 requête (TblDept)
- Total pour afficher la liste : 1 requête

**Maintenant** :
- `getDepartments()` : 2 + 14 requêtes (TblDept + TblCom + 14× CELs par commune)
- Total pour afficher la liste : ~16 requêtes

**Impact** : ⚠️ Légère augmentation, mais acceptable (< 100ms supplémentaires)

### Optimisations possibles (futures)

Si performance critique :
1. Créer une vue SQL avec colonnes communes (sans doublons)
2. Utiliser du caching (Redis) pour les communes d'Abidjan
3. Précharger les CELs de toutes les communes en une requête

---

## 🔐 Impact sur les permissions

### Nouveaux cas d'usage

**User assigné à une commune d'Abidjan** :
```typescript
// L'utilisateur voit uniquement sa commune dans la liste
GET /api/publications/departments
// Retourne : ["ABIDJAN - COCODY"] si assigné à COCODY
```

**User assigné au département Abidjan (022) global** :
```typescript
// L'utilisateur voit TOUTES les communes d'Abidjan
GET /api/publications/departments
// Retourne : Les 14 communes d'Abidjan
```

---

## 📝 Migration des données existantes

### Si des utilisateurs étaient assignés à Abidjan

```sql
-- Voir les utilisateurs assignés au département Abidjan
SELECT u.email, u.firstName, u.lastName, d.LIB_DEPT
FROM users u
INNER JOIN TBL_DEPT d ON u.id = d.NUM_UTIL
WHERE d.COD_DEPT = '022';

-- Option 1 : Assigner à toutes les communes
UPDATE TBL_COM 
SET NUM_UTIL = (SELECT NUM_UTIL FROM TBL_DEPT WHERE COD_DEPT = '022')
WHERE COD_DEPT = '022' AND NUM_UTIL IS NULL;

-- Option 2 : Assigner à des communes spécifiques
UPDATE TBL_COM 
SET NUM_UTIL = '{userId}'
WHERE COD_DEPT = '022' 
AND LIB_COM IN ('COCODY', 'YOPOUGON');
```

---

## 🧹 Nettoyage (optionnel)

### Scripts de développement

Les scripts suivants ont été créés pour le développement et les tests. Vous pouvez les conserver ou les supprimer :

**À conserver (utiles)** :
- `test-abidjan-publication.ts` - Tests de régression
- `show-abidjan-communes.ts` - Debug rapide des communes
- `check-tblcom-columns.ts` - Vérification structure

**Optionnels (analyse)** :
- `analyze-view-liste-cel-departement.ts`
- `investigate-missing-communes.ts`
- `check-missing-cels.ts`
- `test-vue-current-structure.ts`
- `test-vue-updated.ts`

Pour supprimer les scripts optionnels :
```bash
rm scripts/analyze-view-liste-cel-departement.ts
rm scripts/investigate-missing-communes.ts
rm scripts/check-missing-cels.ts
rm scripts/test-vue-current-structure.ts
rm scripts/test-vue-updated.ts
```

---

## 🎓 Notes pour les développeurs

### Ajouter d'autres villes avec publication par communes

Si d'autres villes (ex: Yamoussoukro) nécessitent le même traitement :

1. **Identifier le code département** (ex: '024')

2. **Modifier les méthodes** :
   ```typescript
   // Dans getAbidjanCommunes() → Renommer en getCommunesSpeciales()
   const codesSpeciaux = ['022', '024']; // Abidjan, Yamoussoukro
   
   // Adapter les filtres dans getDepartments()
   const whereStandard: any = {
     codeDepartement: { notIn: codesSpeciaux }
   };
   ```

3. **Mettre à jour les validations**
   ```typescript
   // Dans publishCommune()
   if (!['022', '024'].includes(commune.codeDepartement)) {
     throw new BadRequestException(...);
   }
   ```

### Déboguer les communes manquantes

Si des communes ne s'affichent pas :
```bash
# 1. Vérifier dans TblCom
npx ts-node scripts/show-abidjan-communes.ts

# 2. Vérifier les CELs
npx ts-node scripts/check-missing-cels.ts

# 3. Vérifier la méthode de déduplication
# (getAbidjanCommunes() dans publication.service.ts)
```

---

## 📚 Ressources

- **Documentation technique** : `IMPLEMENTATION_ABIDJAN_COMMUNES.md`
- **Guide frontend** : `GUIDE_FRONTEND_ABIDJAN_COMMUNES.md`
- **Liste des endpoints** : `API_ENDPOINTS_PUBLICATION_COMPLETE.md`
- **Exemples API** : `EXEMPLE_RETOUR_getDepartmentsData.md`

---

## ✅ Checklist de validation

- [x] Code compilé sans erreurs
- [x] Tests passent (14/14 = 100%)
- [x] Documentation complète
- [x] Scripts de test créés
- [x] Schéma Prisma mis à jour
- [x] Endpoints testés
- [ ] Frontend mis à jour (à faire)
- [ ] Tests end-to-end (à faire avec frontend)
- [ ] Déployé en production (à faire)

---

**Status final** : ✅ PRÊT POUR LE DÉPLOIEMENT

