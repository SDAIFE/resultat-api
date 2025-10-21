# 🤝 INTÉGRATION FRONTEND ↔️ BACKEND - Upload Fichiers

**Date** : 10 octobre 2025  
**Statut** : ✅ **Backend implémenté - Prêt pour intégration Frontend**

---

## 📊 RÉSUMÉ EXÉCUTIF

### Ce que le Frontend doit faire différemment

| Action | Avant | ✨ Maintenant |
|--------|-------|------------|
| **Sélection fichier** | 1 fichier (.xlsx, .xls, .xlsm ou .csv) | 1 fichier **.xlsm uniquement** |
| **Conversion** | Optionnelle | **Obligatoire** (Excel → CSV côté client) |
| **Upload** | 1 fichier | **2 fichiers** (excelFile + csvFile) |
| **Champs FormData** | `file` | `excelFile` ET `csvFile` |
| **Validation** | Extension flexible | **.xlsm strict** |

---

## 🎯 CONTRAT D'INTERFACE API

### Endpoint Principal

```http
POST /api/v1/upload/excel
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Request (FormData)

```typescript
{
  excelFile: File,      // ⚠️ OBLIGATOIRE - Extension .xlsm uniquement
  csvFile: File,        // ⚠️ OBLIGATOIRE - Fichier CSV converti
  codeCellule: string,  // ⚠️ OBLIGATOIRE - Ex: "CEC_ABOBO_01"
  nomFichier?: string,  // Optionnel - Ex: "Transmission"
  nombreBv?: number     // Optionnel - Ex: 145
}
```

### Response Success (200/201)

```typescript
{
  id: string,
  codeCellule: string,
  nomFichier: string,
  statutImport: "COMPLETED" | "PENDING" | "PROCESSING" | "ERROR",
  dateImport: string,
  nombreLignesImportees: number,
  nombreLignesEnErreur: number,
  excelPath: string,    // ✨ NOUVEAU - Chemin du fichier Excel stocké
  csvPath: string,      // ✨ NOUVEAU - Chemin du fichier CSV stocké
  details: {
    lignesTraitees: number,
    lignesReussies: number,
    lignesEchouees: number
  }
}
```

### Response Error (400/401/404)

```typescript
{
  statusCode: number,
  message: string,
  error: string
}
```

---

## 💻 CODE MINIMAL FRONTEND

### TypeScript/React

```typescript
// 1. État du composant
const [xlsmFile, setXlsmFile] = useState<File | null>(null);
const [csvFile, setCsvFile] = useState<File | null>(null);

// 2. Validation fichier .xlsm
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  
  if (!file?.name.toLowerCase().endsWith('.xlsm')) {
    alert('Seuls les fichiers .xlsm sont acceptés');
    return;
  }
  
  setXlsmFile(file);
  convertToCsv(file); // Votre logique de conversion existante
};

// 3. Upload
const handleUpload = async () => {
  const formData = new FormData();
  formData.append('excelFile', xlsmFile!);  // ⚠️ Nom important
  formData.append('csvFile', csvFile!);      // ⚠️ Nom important
  formData.append('codeCellule', codeCellule);
  
  const response = await fetch('http://localhost:3001/api/v1/upload/excel', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  
  const result = await response.json();
  console.log('Upload OK:', result.excelPath, result.csvPath);
};
```

---

## ⚠️ POINTS CRITIQUES

### ❌ Ce qui NE MARCHE PLUS

```typescript
// ❌ ANCIEN CODE - Ne fonctionne plus
const formData = new FormData();
formData.append('file', file);  // ❌ Mauvais nom de champ

// ❌ ANCIEN CODE - Extension refusée
const file = 'fichier.xlsx';    // ❌ .xlsx refusé
const file = 'fichier.xls';     // ❌ .xls refusé

// ❌ ANCIEN CODE - Fichier unique
formData.append('file', csvFile); // ❌ Il manque le fichier Excel
```

### ✅ Ce qui FONCTIONNE

```typescript
// ✅ NOUVEAU CODE - Correct
const formData = new FormData();
formData.append('excelFile', xlsmFile);  // ✅ Bon nom + .xlsm
formData.append('csvFile', csvFile);     // ✅ Les 2 fichiers
formData.append('codeCellule', 'CEC_ABOBO_01');
```

---

## 🔍 VALIDATIONS BACKEND

Le backend **REJETTE** automatiquement :

| Cas | Code | Message |
|-----|------|---------|
| Fichier Excel manquant | 400 | "Fichier Excel (.xlsm) manquant" |
| Fichier CSV manquant | 400 | "Fichier CSV manquant" |
| Extension .xlsx | 400 | "Seuls les fichiers .xlsm sont autorisés" |
| Extension .xls | 400 | "Seuls les fichiers .xlsm sont autorisés" |
| Fichier > 10MB | 400 | "Fichier trop volumineux (max 10MB)" |
| CEL inexistante | 404 | "CEL non trouvée" |
| Token invalide | 401 | "Unauthorized" |

---

## 📋 CHECKLIST D'INTÉGRATION

### Frontend

- [ ] Modifier input file : `accept=".xlsm"` uniquement
- [ ] Ajouter validation extension .xlsm côté client
- [ ] Générer le CSV automatiquement après sélection du .xlsm
- [ ] Modifier FormData avec 2 champs : `excelFile` + `csvFile`
- [ ] Gérer les nouveaux champs de réponse : `excelPath`, `csvPath`
- [ ] Afficher les erreurs spécifiques selon le message backend
- [ ] Tester tous les cas d'erreur

### Backend

- [x] ✅ StorageService implémenté
- [x] ✅ Endpoint modifié pour 2 fichiers
- [x] ✅ Validation .xlsm stricte
- [x] ✅ Migration Prisma (champs excelPath/csvPath)
- [x] ✅ Tests de structure réussis
- [x] ✅ Documentation complète

### Tests d'intégration

- [ ] Upload .xlsm + CSV → Succès
- [ ] Upload .xlsx → Rejeté 400
- [ ] Upload .xls → Rejeté 400
- [ ] Upload sans CSV → Rejeté 400
- [ ] Upload sans Excel → Rejeté 400
- [ ] Vérifier chemins dans réponse
- [ ] Vérifier données en base

---

## 🎨 NOUVEAUX ENDPOINTS BONUS

### Upload CEL Signé

```http
POST /api/v1/upload/cels
```

```typescript
FormData {
  file: File,        // PDF, JPG, PNG
  celCode: string,
  celId: string
}
```

### Upload Consolidation

```http
POST /api/v1/upload/consolidation
```

```typescript
FormData {
  file: File,         // Excel, PDF, CSV
  reference: string,
  type?: string
}
```

---

## 📞 COORDINATION

### URLs

| Environnement | URL Backend |
|---------------|-------------|
| Développement | `http://localhost:3001` |
| Staging | `https://api-staging.ceibureau.ci` |
| Production | `https://api.ceibureau.ci` |

### Versions API

- **Actuelle** : `/api/v1/*`
- **Base path** : Toujours préfixer avec `/api/v1`

### CORS

Origines autorisées (configurables) :
- `http://localhost:3000`
- `http://localhost:3001`
- Autres via `CORS_ORIGINS` dans .env

---

## 🧪 TEST RAPIDE

### Avec cURL

```bash
# Obtenir un token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ceibureau.ci","password":"votre_password"}'

# Upload
curl -X POST http://localhost:3001/api/v1/upload/excel \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "excelFile=@fichier.xlsm" \
  -F "csvFile=@fichier.csv" \
  -F "codeCellule=CEC_ABOBO_01" \
  -F "nomFichier=Test"
```

### Réponse attendue

```json
{
  "id": "clxy...",
  "codeCellule": "CEC_ABOBO_01",
  "excelPath": "excel/10/10/2025/CEL_CEC_ABOBO_01_10-10-2025_14h30_Test.xlsm",
  "csvPath": "csv/10/10/2025/CEL_CEC_ABOBO_01_10-10-2025_14h30_Test.csv",
  "statutImport": "COMPLETED",
  "nombreLignesImportees": 145
}
```

---

## 📚 DOCUMENTATION COMPLÈTE

| Document | Description |
|----------|-------------|
| `docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md` | Guide complet Frontend (ce fichier détaillé) |
| `docs/GUIDE_BACKEND_STOCKAGE_FICHIERS.md` | Spécifications Backend |
| `test-upload-files/TEST_UPLOAD.md` | Guide de test manuel |
| `IMPLEMENTATION_COMPLETE.md` | Récapitulatif technique |

---

## ✅ VALIDATION FINALE

### Critères d'acceptation

- [ ] Frontend envoie 2 fichiers (excelFile + csvFile)
- [ ] Seuls les fichiers .xlsm sont acceptés
- [ ] Les fichiers .xlsx et .xls sont bien rejetés
- [ ] Le CSV est généré automatiquement côté client
- [ ] Les chemins de fichiers sont affichés/enregistrés
- [ ] Toutes les erreurs sont gérées proprement
- [ ] Les données sont correctement importées en base

### Prêt pour déploiement quand

- [x] Backend implémenté et testé
- [ ] Frontend adapté et testé
- [ ] Tests d'intégration réussis
- [ ] Documentation partagée
- [ ] Équipes alignées

---

## 🚀 PROCHAINES ÉTAPES

1. **Frontend** : Lire `docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md`
2. **Frontend** : Implémenter les modifications
3. **Frontend** : Tester localement
4. **Backend & Frontend** : Session de tests conjoints
5. **Validation** : Tests end-to-end
6. **Déploiement** : Staging puis Production

---

**Contact Backend** : backend@ceibureau.ci  
**Contact Frontend** : frontend@ceibureau.ci  
**Slack** : #integration-upload-fichiers

---

**Version** : 1.0  
**Date** : 10 octobre 2025  
**Statut** : ✅ Backend Ready - En attente intégration Frontend

