# Guide de Dépannage : Erreurs de Transaction Prisma

## 🔴 Erreur Rencontrée

```
Transaction API error: Transaction not found. Transaction ID is invalid, 
refers to an old closed transaction Prisma doesn't have information about anymore, 
or was obtained before disconnecting.

Code: P2028
```

## 🎯 Cause du Problème

Cette erreur se produit lorsque :

1. **La transaction Prisma expire** avant la fin du traitement
2. Le **timeout par défaut** (5 secondes) est dépassé
3. Le **traitement prend trop de temps** (beaucoup de lignes à insérer)

### Scénarios Typiques

| Scénario | Nombre de Lignes | Temps Estimé | Résultat |
|----------|------------------|--------------|----------|
| Petit fichier | 10-50 lignes | < 5 secondes | ✅ OK avec timeout par défaut |
| Fichier moyen | 50-200 lignes | 5-30 secondes | ⚠️ Risque de timeout |
| Gros fichier | 200-500 lignes | 30-90 secondes | ❌ Timeout garanti (avant fix) |
| Très gros fichier | >500 lignes | >90 secondes | ❌ Timeout même avec fix |

## ✅ Solution Implémentée

### 1. Augmentation des Timeouts

Le code a été modifié pour augmenter les timeouts de la transaction Prisma :

```typescript
await this.prisma.$transaction(async (prisma) => {
  // ... traitement des données ...
}, {
  maxWait: 60000,   // 60 secondes - attente pour obtenir une connexion
  timeout: 120000,  // 120 secondes - durée maximale de la transaction
});
```

### 2. Validation Préventive

La validation des cellules vides se fait **AVANT** la transaction pour éviter :
- De perdre du temps dans la transaction
- D'échouer au milieu du traitement
- De bloquer inutilement les ressources

```typescript
// ✅ Validation AVANT la transaction
for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
  // Vérifier que toutes les cellules sont renseignées
  // Si erreur → throw AVANT d'entrer dans la transaction
}

// Ensuite seulement : démarrer la transaction
await this.prisma.$transaction(async (prisma) => {
  // Insertions...
});
```

## 🔧 Configuration Recommandée

### Option 1 : Configuration par Défaut (Implémentée)

Pour la plupart des cas d'usage :

```typescript
{
  maxWait: 60000,   // 1 minute
  timeout: 120000,  // 2 minutes
}
```

**Capacité :** Jusqu'à **500 lignes** environ

### Option 2 : Configuration pour Gros Volumes

Si vous traitez régulièrement de très gros fichiers (>500 lignes) :

```typescript
{
  maxWait: 120000,  // 2 minutes
  timeout: 300000,  // 5 minutes
}
```

**⚠️ Attention :** Des timeouts trop longs peuvent causer des problèmes :
- Blocage des connexions à la base de données
- Risque de deadlock
- Mauvaise expérience utilisateur (attente trop longue)

### Option 3 : Batch Processing (Recommandé pour >500 lignes)

Au lieu d'une seule grande transaction, diviser en plusieurs batches :

```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
  const batch = dataRows.slice(i, i + BATCH_SIZE);
  
  await this.prisma.$transaction(async (prisma) => {
    for (const row of batch) {
      // Insérer ligne par ligne dans le batch
    }
  }, { timeout: 60000 }); // Timeout plus court car batch plus petit
}
```

## 🐛 Débogage de l'Erreur

### Étape 1 : Vérifier le Nombre de Lignes

Ajoutez un log pour voir combien de lignes sont traitées :

```typescript
console.log(`📊 Nombre de lignes à traiter : ${dataRows.length}`);
```

### Étape 2 : Mesurer le Temps de Traitement

```typescript
const startTime = Date.now();

await this.prisma.$transaction(async (prisma) => {
  // ... traitement ...
}, { timeout: 120000 });

const duration = Date.now() - startTime;
console.log(`⏱️ Temps de traitement : ${duration}ms`);
```

### Étape 3 : Identifier les Goulots d'Étranglement

Si le timeout persiste, vérifiez :

1. **Performance de la base de données**
   ```bash
   # Vérifier les connexions actives
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Logs Prisma détaillés**
   ```typescript
   // Dans prisma.service.ts
   new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   });
   ```

3. **Index sur les tables**
   ```sql
   -- Vérifier les index sur tblImportExcelCel
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'TblImportExcelCel';
   ```

## 📊 Monitoring et Métriques

### Logs à Surveiller

```typescript
console.log(`📥 Fichier Excel stocké: ${excelPath}`);
console.log(`📥 Fichier CSV stocké: ${csvPath}`);
console.log(`🗑️  Suppression de ${existingData.length} enregistrements existants`);
console.log(`✅ Suppression terminée pour la CEL ${codeCellule}`);
console.log(`⏱️ Temps de traitement : ${duration}ms`);
console.log(`✅ Import réussi: ${lignesReussies} lignes importées`);
```

### Métriques Importantes

| Métrique | Valeur Normale | Valeur Préoccupante |
|----------|----------------|---------------------|
| Temps par ligne | < 200ms | > 500ms |
| Temps total (100 lignes) | < 20s | > 40s |
| Temps total (200 lignes) | < 40s | > 80s |
| Taux de réussite | 100% | < 100% |

## 🚀 Optimisations Possibles

### 1. Utiliser `createMany` au lieu de `create` en boucle

**Avant (lent) :**
```typescript
for (const row of dataRows) {
  await prisma.tblImportExcelCel.create({ data: row });
}
```

**Après (rapide) :**
```typescript
await prisma.tblImportExcelCel.createMany({
  data: dataRows.map(row => ({ /* ... */ })),
  skipDuplicates: true,
});
```

**⚠️ Limitation :** `createMany` ne retourne pas les IDs créés, donc impossible d'alimenter `TblBv` en même temps.

### 2. Séparer les Insertions

**Approche en 2 étapes :**

```typescript
// Étape 1 : Insérer dans TblImportExcelCel (rapide avec createMany)
await prisma.tblImportExcelCel.createMany({ data: allData });

// Étape 2 : Alimenter TblBv (séparément, hors transaction si nécessaire)
for (const row of allData) {
  await this.insertBureauVote(row); // Sans transaction
}
```

### 3. Index de Base de Données

Assurez-vous que les index suivants existent :

```sql
-- Index sur codeCellule pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_import_excel_cel_code_cellule 
ON "TblImportExcelCel"("codeCellule");

-- Index sur statutImport pour les filtres
CREATE INDEX IF NOT EXISTS idx_import_excel_cel_statut 
ON "TblImportExcelCel"("statutImport");

-- Index composite pour les bureaux de vote
CREATE INDEX IF NOT EXISTS idx_bv_lookup 
ON "TblBv"("codeDepartement", "codeSousPrefecture", "codeCommune", "codeLieuVote");
```

## 🎯 Checklist de Résolution

Quand l'erreur de timeout se produit :

- [ ] Vérifier le nombre de lignes dans le fichier
- [ ] Consulter les logs pour voir le temps de traitement
- [ ] Vérifier que les timeouts sont bien configurés (60s/120s)
- [ ] Tester avec un fichier plus petit pour confirmer que ça fonctionne
- [ ] Si >500 lignes, envisager le batch processing
- [ ] Vérifier les performances de la base de données
- [ ] Ajouter/optimiser les index si nécessaire
- [ ] Envisager `createMany` pour les insertions en masse

## 📝 Exemple de Message Utilisateur

Si le timeout persiste malgré les optimisations :

```json
{
  "statusCode": 400,
  "message": "Le fichier contient trop de lignes (753 lignes détectées). Pour des raisons de performance et de sécurité, veuillez diviser votre fichier en plusieurs imports de maximum 500 lignes chacun.",
  "error": "Bad Request"
}
```

## 🔗 Ressources

- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Transaction Management](https://www.postgresql.org/docs/current/tutorial-transactions.html)

---

**Date de Création** : 21 octobre 2025  
**Version** : 1.0  
**Dernière Mise à Jour** : 21 octobre 2025

