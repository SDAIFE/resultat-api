# Script de création de la table TBL_LV

Ce script permet de créer et peupler la table `TBL_LV` (Lieux de Vote) à partir du fichier CSV `carto/7-tbl_lv.csv`.

## Prérequis

1. **Base de données configurée** : Assurez-vous que votre fichier `.env` contient la configuration de connexion à la base de données SQL Server.

2. **Tables dépendantes** : Le script vérifie l'existence des tables suivantes :
   - `TBL_DEPT` (Départements)
   - `TBL_SP` (Sous-Préfectures) 
   - `TBL_COM` (Communes)
   - `TBL_CEL` (Cellules Électorales Locales)

3. **Fichier CSV** : Le fichier `carto/7-tbl_lv.csv` doit exister et contenir les colonnes :
   - `COD_DEPT` : Code département
   - `COD_SP` : Code sous-préfecture
   - `COD_COM` : Code commune
   - `COD_LV` : Code lieu de vote
   - `COD_CEL` : Code cellule (optionnel)
   - `LIB_LV` : Libellé lieu de vote

## Utilisation

### Méthode 1 : Via npm script (recommandée)
```bash
npm run create:tbl-lv
```

### Méthode 2 : Exécution directe
```bash
npx ts-node scripts/create-tbl-lv.ts
```

## Fonctionnalités du script

- ✅ **Lecture du fichier CSV** avec séparateur `;`
- ✅ **Validation des données** avant insertion
- ✅ **Vérification des dépendances** (tables parentes)
- ✅ **Insertion par lots** pour optimiser les performances
- ✅ **Gestion des erreurs** avec insertion individuelle en cas d'échec
- ✅ **Suppression des données existantes** avant import
- ✅ **Statistiques détaillées** du processus d'import
- ✅ **Exemples d'enregistrements** insérés

## Structure des données

Le script mappe les colonnes CSV vers les champs de la table Prisma :

| CSV Column | Prisma Field | Description |
|------------|--------------|-------------|
| COD_DEPT | codeDepartement | Code du département |
| COD_SP | codeSousPrefecture | Code de la sous-préfecture |
| COD_COM | codeCommune | Code de la commune |
| COD_LV | codeLieuVote | Code du lieu de vote |
| COD_CEL | codeCellule | Code de la cellule (nullable) |
| LIB_LV | libelleLieuVote | Libellé du lieu de vote |

## Gestion des erreurs

Le script gère plusieurs types d'erreurs :

1. **Fichier CSV manquant** : Vérification de l'existence du fichier
2. **Données invalides** : Filtrage des enregistrements incomplets
3. **Erreurs de contrainte** : Insertion individuelle en cas d'échec de lot
4. **Connexion base de données** : Test de connexion avant traitement

## Exemple de sortie

```
🎯 Script de création de la table TBL_LV
==========================================
🔍 Vérification des dépendances...
📊 Nombre de départements : 31
📊 Nombre de sous-préfectures : 197
📊 Nombre de communes : 197
📊 Nombre de cellules : 197
✅ Vérification des dépendances terminée
🚀 Début de la création de la table TBL_LV...
📁 Lecture du fichier : C:\Users\user\Documents\nextjs_project\resultat-api\carto\7-tbl_lv.csv
✅ 11899 enregistrements lus depuis le CSV
🔌 Test de connexion à la base de données...
✅ Connexion à la base de données établie
📊 Nombre d'enregistrements existants dans TBL_LV : 0
📥 Insertion des données par lots de 1000...
✅ Lot 1 inséré (1000/11899)
✅ Lot 2 inséré (2000/11899)
...
🎉 Import terminé avec succès !
📊 Total d'enregistrements dans TBL_LV : 11899
📈 Enregistrements insérés : 11899
📉 Enregistrements ignorés : 0

📋 Exemples d'enregistrements insérés :
1. 001-001-001-001 | G S ADAHOU EXTENTION 1- 2
2. 001-001-001-002 | EPV METHODISTE
3. 001-001-001-003 | EPP 1 PLATEAU
4. 001-001-001-004 | EPP 1 DIOULAKRO
5. 001-001-001-005 | G S PLATEAU 5

🎉 Script terminé avec succès !
```

## Notes importantes

- Le script supprime toutes les données existantes dans `TBL_LV` avant l'import
- Les enregistrements avec des données manquantes sont ignorés
- Le script utilise des transactions par lot pour optimiser les performances
- En cas d'erreur sur un lot, le script tente une insertion individuelle
- Les contraintes de clés étrangères sont respectées automatiquement par Prisma

## Dépannage

### Erreur de connexion à la base de données
Le script détecte automatiquement les problèmes de connexion et bascule en mode test CSV uniquement. Pour résoudre :

1. **Vérifiez votre fichier `.env`** et assurez-vous que `DATABASE_URL` est correctement configuré
2. **Cohérence des protocoles** : Le schéma Prisma est configuré pour SQL Server (`sqlserver://`) mais votre `.env` utilise PostgreSQL (`postgresql://`)
3. **Assurez-vous que la base de données est accessible** et que les tables dépendantes existent

### Erreur de contrainte de clé étrangère
Assurez-vous que les tables dépendantes (`TBL_DEPT`, `TBL_SP`, `TBL_COM`, `TBL_CEL`) contiennent les données nécessaires.

### Fichier CSV introuvable
Vérifiez que le fichier `carto/7-tbl_lv.csv` existe et est accessible.

### Problème de BOM (Byte Order Mark)
Le script gère automatiquement le BOM invisible au début du fichier CSV qui peut causer des problèmes de parsing.

## Mode de fonctionnement

Le script fonctionne en deux modes :

1. **Mode complet** : Si la connexion à la base de données réussit, le script :
   - Vérifie les dépendances
   - Supprime les données existantes
   - Insère toutes les données du CSV
   - Affiche les statistiques finales

2. **Mode test CSV** : Si la connexion à la base de données échoue, le script :
   - Teste uniquement la lecture du fichier CSV
   - Affiche les statistiques de lecture
   - Fournit des conseils pour résoudre les problèmes de base de données
