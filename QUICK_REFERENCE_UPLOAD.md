# ⚡ QUICK REFERENCE - Upload Fichiers

> **1 page - Tout l'essentiel**

---

## 🔴 3 CHANGEMENTS CRITIQUES

```diff
- ❌ AVANT : 1 fichier (.xlsx, .xls, .xlsm ou .csv)
+ ✅ MAINTENANT : 2 fichiers (.xlsm + .csv)

- ❌ AVANT : formData.append('file', file)
+ ✅ MAINTENANT : formData.append('excelFile', xlsmFile)
+                  formData.append('csvFile', csvFile)

- ❌ AVANT : Extensions flexibles (.xlsx, .xls, .xlsm)
+ ✅ MAINTENANT : Uniquement .xlsm (strict)
```

---

## 💻 CODE MINIMAL

```typescript
// 1️⃣ Valider .xlsm
const file = e.target.files[0];
if (!file.name.endsWith('.xlsm')) return alert('Fichier .xlsm requis');

// 2️⃣ Générer CSV
const csv = await convertToCsv(file);  // Votre logique existante

// 3️⃣ Uploader les 2 fichiers
const formData = new FormData();
formData.append('excelFile', file);    // Nom important: excelFile
formData.append('csvFile', csv);       // Nom important: csvFile
formData.append('codeCellule', 'CEC_ABOBO_01');

await fetch('http://localhost:3001/api/v1/upload/excel', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

## 📥 REQUEST

```http
POST /api/v1/upload/excel
Authorization: Bearer {token}

excelFile: File (.xlsm, max 10MB) ✅ OBLIGATOIRE
csvFile: File (.csv, max 10MB)    ✅ OBLIGATOIRE
codeCellule: string               ✅ OBLIGATOIRE
nomFichier: string                ⭕ Optionnel
nombreBv: number                  ⭕ Optionnel
```

---

## 📤 RESPONSE

```json
✅ Succès (200/201)
{
  "codeCellule": "CEC_ABOBO_01",
  "statutImport": "COMPLETED",
  "nombreLignesImportees": 145,
  "excelPath": "excel/10/10/2025/...",  ← NOUVEAU
  "csvPath": "csv/10/10/2025/..."       ← NOUVEAU
}

❌ Erreur (400)
{
  "statusCode": 400,
  "message": "Seuls les fichiers .xlsm sont autorisés"
}
```

---

## ⚠️ VALIDATIONS BACKEND

| Fichier | Extension | Résultat |
|---------|-----------|----------|
| `fichier.xlsm` + CSV | ✅ .xlsm | ✅ Accepté |
| `fichier.xlsx` + CSV | ❌ .xlsx | ❌ Rejeté 400 |
| `fichier.xls` + CSV | ❌ .xls | ❌ Rejeté 400 |
| Uniquement Excel | - | ❌ Rejeté 400 "CSV manquant" |
| Uniquement CSV | - | ❌ Rejeté 400 "Excel manquant" |

---

## ✅ CHECKLIST

- [ ] Input : `accept=".xlsm"`
- [ ] Valider extension .xlsm côté client
- [ ] Générer CSV automatiquement
- [ ] FormData avec `excelFile` + `csvFile`
- [ ] Gérer `excelPath` et `csvPath` dans réponse

---

## 📚 DOCS

| Besoin | Document |
|--------|----------|
| **Code complet** | `docs/GUIDE_FRONTEND_UPLOAD_FICHIERS.md` |
| **Résumé technique** | `INTEGRATION_FRONTEND_BACKEND.md` |
| **Tests** | `test-upload-files/TEST_UPLOAD.md` |

---

## 🆘 AIDE RAPIDE

```bash
# Tester avec cURL
curl -X POST http://localhost:3001/api/v1/upload/excel \
  -H "Authorization: Bearer TOKEN" \
  -F "excelFile=@fichier.xlsm" \
  -F "csvFile=@fichier.csv" \
  -F "codeCellule=CEC_ABOBO_01"
```

**Support** : backend@ceibureau.ci | Slack: #integration-upload-fichiers

---

**Statut** : ✅ Backend Ready | Version: 1.0 | Date: 10 oct 2025

