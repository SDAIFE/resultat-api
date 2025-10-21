# 📤 INTÉGRATION UPLOAD FICHIERS - FRONTEND ↔️ BACKEND

> **Statut**: ✅ Backend implémenté et prêt  
> **Date**: 10 octobre 2025  
> **Version API**: v1

---

## 🚨 CHANGEMENTS IMPORTANTS

### 🔴 BREAKING CHANGES

| # | Changement | Impact Frontend | Priorité |
|---|------------|-----------------|----------|
| 1 | Extension .xlsm UNIQUEMENT | Modifier `accept=".xlsm"` | 🔴 CRITIQUE |
| 2 | 2 fichiers requis (Excel + CSV) | Envoyer `excelFile` ET `csvFile` | 🔴 CRITIQUE |
| 3 | Noms champs FormData changés | `file` → `excelFile` + `csvFile` | 🔴 CRITIQUE |

---

## 📊 AVANT / APRÈS

### ❌ AVANT (Ancienne implémentation)

```typescript
// Frontend envoyait 1 fichier
const formData = new FormData();
formData.append('file', file);  // .xlsx, .xls, .xlsm ou .csv

// Backend acceptait tous les types
POST /api/v1/upload/excel
```

### ✅ APRÈS (Nouvelle implémentation)

```typescript
// Frontend envoie 2 fichiers
const formData = new FormData();
formData.append('excelFile', xlsmFile);  // .xlsm UNIQUEMENT
formData.append('csvFile', csvFile);     // .csv généré par frontend

// Backend valide strictement
POST /api/v1/upload/excel
```

---

## 🎯 CE QUE LE FRONTEND DOIT FAIRE

### Étape 1 : Validation fichier

```typescript
// ✅ Accepter uniquement .xlsm
<input type="file" accept=".xlsm" onChange={handleFileChange} />

// ✅ Valider l'extension
const handleFileChange = (e) => {
  const file = e.target.files[0];
  
  if (!file.name.toLowerCase().endsWith('.xlsm')) {
    alert('Seuls les fichiers .xlsm sont acceptés');
    return;
  }
  
  setXlsmFile(file);
  convertToCsv(file);  // Votre logique existante
};
```

### Étape 2 : Conversion CSV

```typescript
// ✅ Générer le CSV automatiquement
const convertToCsv = (xlsmFile) => {
  // Utilisez votre logique de conversion existante
  // avec la bibliothèque xlsx par exemple
  const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  const csvFile = new File([csv], 'data.csv', { type: 'text/csv' });
  setCsvFile(csvFile);
};
```

### Étape 3 : Upload

```typescript
// ✅ Envoyer les 2 fichiers
const handleUpload = async () => {
  const formData = new FormData();
  formData.append('excelFile', xlsmFile);    // ⚠️ Nom important
  formData.append('csvFile', csvFile);       // ⚠️ Nom important
  formData.append('codeCellule', codeCellule);
  
  const response = await fetch('http://localhost:3001/api/v1/upload/excel', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    alert(error.message);
    return;
  }
  
  const result = await response.json();
  console.log('✅ Upload réussi!');
  console.log('Excel:', result.excelPath);
  console.log('CSV:', result.csvPath);
};
```

---

## 📝 CONTRAT API

### Request

```javascript
POST /api/v1/upload/excel
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData {
  excelFile: File,      // .xlsm uniquement, max 10MB
  csvFile: File,        // .csv, max 10MB
  codeCellule: string,  // Ex: "CEC_ABOBO_01"
  nomFichier?: string,  // Optionnel
  nombreBv?: number     // Optionnel
}
```

### Response Success

```json
{
  "id": "clxy123...",
  "codeCellule": "CEC_ABOBO_01",
  "statutImport": "COMPLETED",
  "nombreLignesImportees": 145,
  "excelPath": "excel/10/10/2025/CEL_CEC_ABOBO_01_10-10-2025_14h30_Transmission.xlsm",
  "csvPath": "csv/10/10/2025/CEL_CEC_ABOBO_01_10-10-2025_14h30_Transmission.csv"
}
```

### Response Error

```json
{
  "statusCode": 400,
  "message": "Seuls les fichiers .xlsm sont autorisés",
  "error": "Bad Request"
}
```

---

## ⚠️ VALIDATIONS BACKEND

Le backend **REJETTE** :

| Cas | Code HTTP | Message |
|-----|-----------|---------|
| `.xlsx` ou `.xls` | 400 | "Seuls les fichiers .xlsm sont autorisés" |
| Fichier Excel manquant | 400 | "Fichier Excel (.xlsm) manquant" |
| Fichier CSV manquant | 400 | "Fichier CSV manquant" |
| Fichier > 10MB | 400 | "Fichier trop volumineux (max 10MB)" |
| CEL inexistante | 404 | "CEL non trouvée" |
| Token invalide | 401 | "Unauthorized" |

---

## ✅ CHECKLIST FRONTEND

### Code

- [ ] Input accepte uniquement `.xlsm`
- [ ] Validation extension côté client
- [ ] Conversion Excel → CSV automatique
- [ ] FormData avec `excelFile` + `csvFile`
- [ ] Gestion nouveaux champs réponse (`excelPath`, `csvPath`)
- [ ] Affichage erreurs spécifiques

### Tests

- [ ] Upload .xlsm + CSV → ✅ Succès
- [ ] Upload .xlsx → ❌ Rejeté 400
- [ ] Upload .xls → ❌ Rejeté 400
- [ ] Upload sans CSV → ❌ Rejeté 400
- [ ] Upload sans Excel → ❌ Rejeté 400
- [ ] Upload > 10MB → ❌ Rejeté 400

---

## 📚 DOCUMENTATION COMPLÈTE

| Document | Description | Pour qui |
|----------|-------------|----------|
| **`docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md`** | Guide complet avec exemples de code | 👨‍💻 Frontend |
| **`INTEGRATION_FRONTEND_BACKEND.md`** | Résumé technique rapide | 👥 Les deux équipes |
| **`BACKEND_FRONTEND_CONTRACT.json`** | Contrat d'interface en JSON | 🤖 Automatisation |
| **`docs/GUIDE_BACKEND_STOCKAGE_FICHIERS.md`** | Spécifications backend | 👨‍💻 Backend |
| **`test-upload-files/TEST_UPLOAD.md`** | Guide de test manuel | 🧪 QA |

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Lire la documentation

```bash
# Guide principal pour le frontend
cat docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md

# Résumé rapide
cat INTEGRATION_FRONTEND_BACKEND.md
```

### 2. Tester l'API

```bash
# Obtenir un token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ceibureau.ci","password":"password"}'

# Tester l'upload
curl -X POST http://localhost:3001/api/v1/upload/excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "excelFile=@fichier.xlsm" \
  -F "csvFile=@fichier.csv" \
  -F "codeCellule=CEC_ABOBO_01"
```

### 3. Implémenter côté frontend

Voir exemples complets dans :
- `docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md` (lignes 119-250)

---

## 🆘 SUPPORT

### En cas de problème

1. **Erreur 400** : Vérifiez les noms de champs (`excelFile`, `csvFile`)
2. **Extension refusée** : Assurez-vous d'envoyer un fichier `.xlsm`
3. **Fichier manquant** : Vérifiez que les 2 fichiers sont envoyés
4. **Erreur 401** : Vérifiez votre token d'authentification

### Contacts

- **Backend** : backend@ceibureau.ci
- **Frontend** : frontend@ceibureau.ci
- **Slack** : `#integration-upload-fichiers`

---

## 🎯 ROADMAP

| Étape | Statut | Date |
|-------|--------|------|
| ✅ Backend implémenté | DONE | 10 oct 2025 |
| ✅ Documentation créée | DONE | 10 oct 2025 |
| ⏳ Frontend adapte le code | TODO | - |
| ⏳ Tests d'intégration | TODO | - |
| ⏳ Validation conjointe | TODO | - |
| ⏳ Déploiement staging | TODO | - |
| ⏳ Déploiement production | TODO | - |

---

## 💡 EXEMPLE MINIMAL

```typescript
// Composant React minimal
function UploadPage() {
  const [xlsm, setXlsm] = useState(null);
  const [csv, setCsv] = useState(null);
  
  return (
    <div>
      <input 
        type="file" 
        accept=".xlsm"
        onChange={e => {
          const file = e.target.files[0];
          setXlsm(file);
          convertToCsv(file).then(setCsv);
        }}
      />
      
      <button onClick={() => {
        const fd = new FormData();
        fd.append('excelFile', xlsm);
        fd.append('csvFile', csv);
        fd.append('codeCellule', 'CEC_ABOBO_01');
        
        fetch('/api/v1/upload/excel', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
      }}>
        Upload
      </button>
    </div>
  );
}
```

---

**Version** : 1.0  
**Dernière mise à jour** : 10 octobre 2025  
**Statut** : ✅ Backend Ready - En attente Frontend

