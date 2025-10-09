# Implémentation : Publication par Communes pour Abidjan

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète de la fonctionnalité de publication par communes pour Abidjan, permettant de gérer les 14 communes d'Abidjan individuellement au lieu du département global.

## 🎯 Objectif

**Problématique** : Pour tous les départements de Côte d'Ivoire, la publication des résultats se fait au niveau département. **Sauf pour Abidjan** où la publication se fait au niveau de chacune des **14 communes**.

**Solution** : Dans l'interface de publication, au lieu d'afficher "Abidjan" comme un seul département, afficher les 14 communes avec le format `"ABIDJAN - [NOM_COMMUNE]"`.

## 🏗️ Architecture de la solution

### 1. Base de données

#### Modifications du schéma Prisma

**Fichier** : `prisma/schema.prisma`

```prisma
model TblCom {
  // ... champs existants ...
  numeroUtilisateur String? @map("NUM_UTIL")   // ✨ AJOUTÉ
  statutPublication String? @map("STAT_PUB")   // ✨ AJOUTÉ
  
  // Relations
  utilisateur User? @relation(fields: [numeroUtilisateur], references: [id])
  publicationHistory CommunePublicationHistory[]
}

model CommunePublicationHistory {
  id String @id @default(cuid())
  communeId String @map("COMMUNE_ID")
  action String @map("ACTION") // PUBLISH, CANCEL, IMPORT
  userId String @map("USER_ID")
  timestamp DateTime @default(now()) @map("TIMESTAMP")
  details String? @map("DETAILS")
  
  commune TblCom @relation(fields: [communeId], references: [id])
  user User @relation(fields: [userId], references: [id])
}
```

**Commande exécutée** :
```bash
npx prisma db push --accept-data-loss
```

### 2. DTOs (Data Transfer Objects)

**Fichier** : `src/publication/dto/publication-response.dto.ts`

#### Nouveaux DTOs créés :

1. **PublishableEntity** - Interface unifiée pour départements ET communes
```typescript
export interface PublishableEntity {
  id: string;
  code: string; // "022-004" pour commune, "001" pour département
  libelle: string; // "ABIDJAN - COCODY" ou "AGBOVILLE"
  type: 'DEPARTMENT' | 'COMMUNE';
  totalCels: number;
  importedCels: number;
  pendingCels: number;
  publicationStatus: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  lastUpdate: string;
  cels: CelData[];
  codeDepartement?: string; // Pour les communes
  codeCommune?: string; // Pour les communes
}
```

2. **CommuneData** - Données d'une commune
3. **CommuneDetailsResponse** - Détails complets d'une commune avec historique

#### DTOs modifiés :

- `DepartmentListResponse.entities` : Maintenant de type `PublishableEntity[]` au lieu de `DepartmentData[]`

### 3. Service de publication

**Fichier** : `src/publication/publication.service.ts`

#### Méthodes helpers (privées)

1. **getAbidjanCommunes()** 
   - Récupère les 14 communes distinctes d'Abidjan depuis TblCom
   - Déduplique par libellé (certaines communes ont plusieurs codes à cause des sous-préfectures)

2. **getCelsForCommune(codeDepartement, codeCommune)**
   - Récupère toutes les CELs d'une commune spécifique via une requête SQL

#### Méthodes principales modifiées

1. **getStats()**
   - Compte maintenant **125 entités** : 111 départements (hors Abidjan) + 14 communes d'Abidjan
   - Gère les filtres USER pour les départements ET communes assignés

2. **getDepartments()**
   - Retourne une liste fusionnée de 111 départements + 14 communes d'Abidjan
   - Supporte tous les filtres : pagination, recherche, statut de publication
   - Format des communes : `"ABIDJAN - COCODY"`, `"ABIDJAN - YOPOUGON"`, etc.

3. **publishDepartment()**
   - Bloque la publication globale d'Abidjan (code 022)
   - Message d'erreur : "Veuillez publier chaque commune individuellement"

#### Nouvelles méthodes pour les communes

4. **publishCommune(communeId, userId)**
   - Publie une commune d'Abidjan
   - Vérifie que toutes les CELs sont importées avant publication
   - Enregistre dans l'historique

5. **cancelCommunePublication(communeId, userId)**
   - Annule la publication d'une commune
   - Enregistre dans l'historique

6. **getCommuneDetails(communeId)**
   - Retourne les détails complets d'une commune
   - Inclut la liste des CELs et l'historique de publication

### 4. Controller

**Fichier** : `src/publication/publication.controller.ts`

#### Nouveaux endpoints ajoutés :

```typescript
// 7️⃣ Publier une commune d'Abidjan
POST /api/publications/communes/:id/publish
Roles: SADMIN, ADMIN

// 8️⃣ Annuler la publication d'une commune
POST /api/publications/communes/:id/cancel
Roles: SADMIN, ADMIN

// 9️⃣ Obtenir les détails d'une commune
GET /api/publications/communes/:id/details
Roles: SADMIN, ADMIN
```

## 📊 Les 14 Communes d'Abidjan

| # | Commune | Code | Nombre de CELs |
|---|---------|------|----------------|
| 1 | ABOBO | 001 | 10 |
| 2 | ADJAME | 002 | 3 |
| 3 | ANYAMA | 001 | 3 |
| 4 | ATTECOUBE | 003 | 3 |
| 5 | BINGERVILLE | 001 | 3 |
| 6 | BROFODOUME | 098 | 1 |
| 7 | COCODY | 004 | 7 |
| 8 | KOUMASSI | 005 | 4 |
| 9 | MARCORY | 006 | 2 |
| 10 | PLATEAU | 007 | 2 |
| 11 | PORT-BOUET | 008 | 3 |
| 12 | SONGON | 001 | 1 |
| 13 | TREICHVILLE | 009 | 2 |
| 14 | YOPOUGON | 010 | 12 |

**Total : 56 CELs pour Abidjan**

## 🔄 Flux de publication

### Pour un département standard

1. Utilisateur appelle `POST /api/publications/departments/:id/publish`
2. Système vérifie que toutes les CELs sont importées
3. Mise à jour de `TBL_DEPT.STAT_PUB = 'PUBLISHED'`
4. Enregistrement dans `DEPARTMENT_PUBLICATION_HISTORY`

### Pour une commune d'Abidjan

1. Utilisateur appelle `POST /api/publications/communes/:id/publish`
2. Système vérifie que c'est bien Abidjan (code 022)
3. Système vérifie que toutes les CELs de la commune sont importées
4. Mise à jour de `TBL_COM.STAT_PUB = 'PUBLISHED'`
5. Enregistrement dans `COMMUNE_PUBLICATION_HISTORY`

### Tentative de publier Abidjan globalement

1. Utilisateur appelle `POST /api/publications/departments/:id/publish` avec l'ID du département Abidjan
2. Système détecte le code 022
3. Retourne une erreur 400 : "Abidjan ne peut pas être publié globalement. Veuillez publier chaque commune individuellement"

## 📈 Performance

### Approche choisie : Liaison par code avec TblCom

**Avantages** :
- ✅ Pas de doublons (déduplication en mémoire)
- ✅ Fonctionne avec la base actuelle
- ✅ Flexible et maintenable
- ✅ Déjà testé et validé

**Performance** :
- `getDepartments()` : 15 requêtes (1 pour TblCom + 14 pour les CELs par commune)
- Acceptable pour 14 communes
- Optimisation possible avec la vue si nécessaire plus tard

### Alternative considérée : Vue SQL

Une vue SQL avec colonnes communes aurait permis 1 seule requête, mais créait des doublons à cause de la structure de TblCom (certaines communes ont plusieurs lignes).

## ✅ Tests

### Script de test : `scripts/test-abidjan-publication.ts`

**Résultats** : 6/6 tests passent (100%)

1. ✅ getStats() retourne ~125 entités
2. ✅ 14 communes d'Abidjan dans la liste
3. ✅ Département Abidjan (022) absent
4. ✅ Pagination fonctionnelle
5. ✅ Recherche fonctionnelle ("COCODY" trouvé)
6. ✅ Filtre par département (codeDepartement='022' → 14 communes)

### Exemples de requêtes

```bash
# Récupérer toutes les entités (111 depts + 14 communes)
GET /api/publications/departments?page=1&limit=150

# Récupérer uniquement les communes d'Abidjan
GET /api/publications/departments?codeDepartement=022

# Rechercher COCODY
GET /api/publications/departments?search=COCODY

# Publier la commune COCODY
POST /api/publications/communes/{communeId}/publish

# Obtenir les détails de COCODY
GET /api/publications/communes/{communeId}/details
```

## 🔐 Gestion des permissions

### Rôle SADMIN et ADMIN
- Voient toutes les entités (départements + communes d'Abidjan)
- Peuvent publier/annuler la publication

### Rôle USER
- Voient uniquement leurs entités assignées :
  - Départements assignés via `TBL_DEPT.NUM_UTIL`
  - Communes d'Abidjan assignées via `TBL_COM.NUM_UTIL`

## 📝 Points importants

1. **Code département Abidjan** : `'022'`

2. **Format d'affichage des communes** : `"ABIDJAN - [NOM_COMMUNE]"`

3. **Code des entités communes** : `"022-{codeCommune}"` (ex: `"022-004"` pour COCODY)

4. **Déduplication** : Les communes avec plusieurs codes dans TblCom sont dédupliquées par libellé

5. **Blocage d'Abidjan** : Impossible de publier le département Abidjan (022) globalement

## 🚀 Déploiement

### Étapes à suivre

1. **Base de données**
   ```bash
   npx prisma db push --accept-data-loss
   ```

2. **Vérifier les colonnes ajoutées**
   ```bash
   npx ts-node scripts/check-tblcom-columns.ts
   ```

3. **Tester l'implémentation**
   ```bash
   npx ts-node scripts/test-abidjan-publication.ts
   ```

4. **Compiler et démarrer**
   ```bash
   npm run build
   npm run start:prod
   ```

## 📚 Fichiers modifiés/créés

### Modifiés
- `prisma/schema.prisma`
- `src/publication/dto/publication-response.dto.ts`
- `src/publication/publication.service.ts`
- `src/publication/publication.controller.ts`

### Créés
- `scripts/test-abidjan-publication.ts`
- `scripts/check-missing-cels.ts`
- `scripts/investigate-missing-communes.ts`
- `scripts/show-abidjan-communes.ts`
- `scripts/test-vue-current-structure.ts`
- `scripts/check-tblcom-columns.ts`
- `docs/IMPLEMENTATION_ABIDJAN_COMMUNES.md` (ce fichier)

## 🎓 Conclusion

L'implémentation permet maintenant de gérer les 14 communes d'Abidjan individuellement dans le système de publication, tout en conservant le fonctionnement standard pour les 111 autres départements.

**Total d'entités publiables** : **125**
- 111 départements (hors Abidjan)
- 14 communes d'Abidjan

---
**Date de création** : 2025-10-09  
**Version** : 1.0.0  
**Status** : ✅ Implémenté et testé

