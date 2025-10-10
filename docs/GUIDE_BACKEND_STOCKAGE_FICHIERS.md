# 🎯 GUIDE BACKEND - Gestion Stockage Fichiers

**Date** : 9 octobre 2025  
**Destinataires** : Équipe Backend (NestJS)  
**Priorité** : ⚠️ **CRITIQUE** - Migration stockage fichiers

---

## 📋 CONTEXTE

### Problème actuel

Le frontend (Next.js sur Vercel) ne peut pas stocker de fichiers de manière persistante car Vercel est un environnement serverless éphémère. Les fichiers uploadés dans `/private/uploads` sont effacés à chaque déploiement.

### Solution

**Déléguer tout le stockage au backend NestJS** (hébergé sur Linux), qui possède un système de fichiers persistant.

---

## 🎯 OBJECTIFS

1. ✅ Recevoir les fichiers Excel **directement** depuis le frontend
2. ✅ Stocker les fichiers Excel de manière **persistante**
3. ✅ Convertir Excel → CSV **côté serveur**
4. ✅ Traiter et importer les données
5. ✅ Fournir des endpoints pour récupérer/gérer les fichiers

---

## 📂 STRUCTURE DE STOCKAGE

### Indications générales

Le backend est **libre de choisir sa structure de stockage**. Voici quelques recommandations :

#### Organisation suggérée
- Séparer les fichiers Excel (.xlsm) des fichiers CSV
- Organiser par date ou par code cellule
- Hors du code source pour faciliter les sauvegardes
- Permissions restrictives (lecture/écriture limitées)

#### Exemple possible (non obligatoire)
```
/votre/dossier/uploads/
├── excel/                    # Fichiers .xlsm originaux
├── csv/                      # Fichiers CSV convertis
├── cels/                     # Fichiers CEL signés
└── consolidation/            # Fichiers de consolidation
```

#### Permissions recommandées
- Dossiers : `750` (rwxr-x---)
- Fichiers : `640` (rw-r-----)
- Propriétaire : utilisateur serveur web

---

## 🔧 ENDPOINTS À IMPLÉMENTER/MODIFIER

### 1. `POST /api/v1/upload/excel`

**Objectif** : Recevoir les fichiers Excel (.xlsm) et CSV, les stocker, et importer les données

#### ⚠️ IMPORTANT : Le frontend envoie LES DEUX fichiers

Le frontend :
1. Sélectionne un fichier `.xlsm`
2. Le convertit en CSV côté client
3. Envoie **les deux fichiers ensemble** au backend

#### Requête

```http
POST /api/v1/upload/excel
Content-Type: multipart/form-data

FormData:
- excelFile: File (.xlsm uniquement)
- csvFile: File (.csv généré par le frontend)
- codeCellule: string (ex: "ABJA")
- nomFichier?: string (optionnel, nom personnalisé)
- nombreBv?: number (optionnel, nombre de bureaux de vote)
```

#### Validation côté serveur

```typescript
// Validations à effectuer
class UploadExcelDto {
  @IsNotEmpty()
  @MaxFileSize(10 * 1024 * 1024) // 10MB
  @AllowedMimeTypes([
    'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm UNIQUEMENT
  ])
  excelFile: Express.Multer.File; // Fichier .xlsm original

  @IsNotEmpty()
  @MaxFileSize(10 * 1024 * 1024) // 10MB
  @AllowedMimeTypes(['text/csv'])
  csvFile: Express.Multer.File; // Fichier CSV (converti par le frontend)

  @IsNotEmpty()
  @IsString()
  @Length(3, 10)
  codeCellule: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomFichier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nombreBv?: number;
}
```

#### Logique du contrôleur

```typescript
@Post('excel')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'excelFile', maxCount: 1 },
    { name: 'csvFile', maxCount: 1 },
  ])
)
async uploadExcel(
  @UploadedFiles() files: {
    excelFile?: Express.Multer.File[];
    csvFile?: Express.Multer.File[];
  },
  @Body() uploadDto: UploadExcelDto,
  @Request() req: any
) {
  try {
    // 1. ✅ Validation des fichiers
    if (!files.excelFile || !files.excelFile[0]) {
      throw new BadRequestException('Fichier Excel (.xlsm) manquant');
    }
    
    if (!files.csvFile || !files.csvFile[0]) {
      throw new BadRequestException('Fichier CSV manquant');
    }

    const excelFile = files.excelFile[0];
    const csvFile = files.csvFile[0];

    // 2. ✅ Validation stricte du type .xlsm
    if (!excelFile.originalname.endsWith('.xlsm')) {
      throw new BadRequestException('Seuls les fichiers .xlsm sont autorisés');
    }

    // Vérifier le type MIME réel
    const realMimeType = await this.fileService.detectMimeType(excelFile.buffer);
    if (!realMimeType.includes('excel') && !realMimeType.includes('ms-excel')) {
      throw new BadRequestException('Type de fichier invalide (pas un fichier Excel)');
    }

    // 3. ✅ Stocker le fichier Excel (.xlsm)
    const excelPath = await this.storageService.storeExcelFile({
      file: excelFile,
      codeCellule: uploadDto.codeCellule,
      nomFichier: uploadDto.nomFichier,
    });

    // 4. ✅ Stocker le fichier CSV (déjà converti par le frontend)
    const csvPath = await this.storageService.storeCsvFile({
      file: csvFile,
      codeCellule: uploadDto.codeCellule,
      nomFichier: uploadDto.nomFichier,
    });

    // 5. ✅ Parser et valider le CSV
    const parsedData = await this.csvService.parseCsv(csvPath);
    
    // Validation des données
    const validationResult = await this.validateImportData(parsedData);
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Données invalides',
        errors: validationResult.errors
      });
    }

    // 6. ✅ Créer l'enregistrement d'import
    const importRecord = await this.importService.create({
      codeCellule: uploadDto.codeCellule,
      nomFichier: uploadDto.nomFichier || excelFile.originalname,
      nombreBv: uploadDto.nombreBv,
      excelPath: excelPath,  // Chemin du .xlsm
      csvPath: csvPath,      // Chemin du .csv
      statut: ImportStatus.N, // En attente
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    });

    // 7. ✅ Traiter l'import (async si nécessaire)
    await this.importService.processImport(importRecord.id);

    // 8. ✅ Retourner le résultat
    return {
      id: importRecord.id,
      codeCellule: importRecord.codeCellule,
      nomFichier: importRecord.nomFichier,
      statut: importRecord.statut,
      excelFileId: importRecord.id, // ID opaque
      message: 'Fichiers uploadés et traités avec succès'
    };

  } catch (error) {
    // Log l'erreur
    this.logger.error('Erreur upload Excel:', error);
    
    // Retourner erreur appropriée
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerErrorException('Erreur lors du traitement des fichiers');
  }
}
```

#### Réponse succès

```json
{
  "id": "uuid-import-123",
  "codeCellule": "ABJA",
  "nomFichier": "Transmission_ABJA_2025.xlsx",
  "statut": "N",
  "excelFileId": "uuid-import-123",
  "message": "Fichier uploadé et traité avec succès",
  "createdAt": "2025-01-09T14:30:00Z"
}
```

#### Réponse erreur

```json
{
  "statusCode": 400,
  "message": "Données invalides",
  "errors": [
    {
      "ligne": 15,
      "colonne": "nombre_electeurs",
      "erreur": "Valeur numérique attendue, reçu 'ABC'"
    }
  ]
}
```

---

### 2. `POST /api/v1/upload/cels`

**Objectif** : Recevoir un fichier CEL signé (PDF, image)

#### Requête

```http
POST /api/v1/upload/cels
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
- file: File (PDF, JPG, PNG)
- celId: string (ID de la cellule)
- celCode: string (Code de la cellule, ex: "S006", "ABJA")
```

#### Validation côté serveur

```typescript
class UploadCelDto {
  @IsNotEmpty()
  @MaxFileSize(10 * 1024 * 1024) // 10MB
  @AllowedMimeTypes([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ])
  file: Express.Multer.File;

  @IsNotEmpty()
  @IsString()
  celId: string;

  @IsNotEmpty()
  @IsString()
  celCode: string;
}
```

#### Logique du contrôleur

```typescript
@Post('cels')
@UseInterceptors(FileInterceptor('file'))
async uploadCelFile(
  @UploadedFile() file: Express.Multer.File,
  @Body() uploadDto: UploadCelDto,
  @Request() req: any
) {
  try {
    // 1. ✅ Validation
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale : 10MB');
    }

    // 2. ✅ Stocker le fichier (sur le serveur Linux)
    const filePath = await this.storageService.storeCelFile({
      file: file,
      celCode: uploadDto.celCode,
      celId: uploadDto.celId,
    });

    // 3. ✅ Créer l'enregistrement en base de données
    const celFile = await this.celFileService.create({
      celId: uploadDto.celId,
      celCode: uploadDto.celCode,
      fileName: file.originalname,
      filePath: filePath,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    });

    // 4. ✅ Retourner le résultat
    return {
      success: true,
      fileId: celFile.id,
      fileName: file.originalname,
      filePath: filePath,
      fileSize: file.size,
      fileType: file.mimetype,
      message: 'Fichier CEL signé uploadé avec succès'
    };
    
  } catch (error) {
    this.logger.error('Erreur upload fichier CEL:', error);
    
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerErrorException('Erreur lors du traitement du fichier');
  }
}
```

#### Réponse succès

```json
{
  "success": true,
  "fileId": "uuid-file-123",
  "fileName": "CEL_S006_SIGNE.pdf",
  "filePath": "cels/S006/1760092515778_CEL_S006_SIGNE.pdf",
  "fileSize": 2457600,
  "fileType": "application/pdf",
  "message": "Fichier CEL signé uploadé avec succès"
}
```

---

### 3. `POST /api/v1/upload/consolidation`

**Objectif** : Recevoir un fichier de consolidation

#### Logique similaire

```typescript
@Post('consolidation')
@UseInterceptors(FileInterceptor('file'))
async uploadConsolidation(
  @UploadedFile() file: Express.Multer.File,
  @Body() uploadDto: UploadConsolidationDto,
) {
  // Validation
  // Stockage
  // Traitement spécifique consolidation
  // Retour
}
```

---

## 🛠️ SERVICES À CRÉER

### 1. StorageService

**Responsabilité** : Gérer le stockage physique des fichiers

```typescript
@Injectable()
export class StorageService {
  private readonly uploadDir = process.env.UPLOAD_DIR || '/var/www/uploads';

  /**
   * Stocker un fichier Excel (.xlsm)
   */
  async storeExcelFile(params: {
    file: Express.Multer.File;
    codeCellule: string;
    nomFichier?: string;
  }): Promise<string> {
    // Votre logique de stockage ici
    // Exemple avec organisation par date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const dir = path.join(this.uploadDir, 'excel', String(year), month);
    await fs.promises.mkdir(dir, { recursive: true });

    const timestamp = Date.now();
    const fileName = `${timestamp}_${params.codeCellule}_${params.nomFichier || params.file.originalname}`;
    
    const filePath = path.join(dir, fileName);
    await fs.promises.writeFile(filePath, params.file.buffer);
    await fs.promises.chmod(filePath, 0o640);

    return path.join('excel', String(year), month, fileName);
  }

  /**
   * Stocker un fichier CSV
   */
  async storeCsvFile(params: {
    file: Express.Multer.File;
    codeCellule: string;
    nomFichier?: string;
  }): Promise<string> {
    // Même logique mais pour les CSV
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const dir = path.join(this.uploadDir, 'csv', String(year), month);
    await fs.promises.mkdir(dir, { recursive: true });

    const timestamp = Date.now();
    const csvFileName = params.nomFichier 
      ? params.nomFichier.replace(/\.xlsm$/, '.csv')
      : params.file.originalname;
    const fileName = `${timestamp}_${params.codeCellule}_${csvFileName}`;
    
    const filePath = path.join(dir, fileName);
    await fs.promises.writeFile(filePath, params.file.buffer);
    await fs.promises.chmod(filePath, 0o640);

    return path.join('csv', String(year), month, fileName);
  }

  /**
   * Stocker un fichier CEL
   */
  async storeCelFile(params: {
    file: Express.Multer.File;
    celCode: string;
    celId: string;
  }): Promise<string> {
    const dir = path.join(this.uploadDir, 'cels', params.celCode);
    await fs.promises.mkdir(dir, { recursive: true });

    const timestamp = Date.now();
    const extension = path.extname(params.file.originalname);
    const fileName = `${timestamp}_${params.celId}${extension}`;
    const filePath = path.join(dir, fileName);

    await fs.promises.writeFile(filePath, params.file.buffer);
    await fs.promises.chmod(filePath, 0o640);

    return path.join('cels', params.celCode, fileName);
  }

  /**
   * Récupérer un fichier
   */
  async getFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, relativePath);
    
    // Vérifier que le fichier existe
    if (!await fs.promises.access(fullPath).then(() => true).catch(() => false)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    return fs.promises.readFile(fullPath);
  }
}
```

---

### 2. ConversionService

**Responsabilité** : ~~Convertir Excel → CSV~~ **NON NÉCESSAIRE**

⚠️ **Note importante** : La conversion Excel → CSV est faite **côté frontend**. Le backend reçoit déjà les deux fichiers (.xlsm et .csv).

**Ce service n'est donc pas nécessaire** pour le workflow principal d'upload.

Vous pouvez créer un service de conversion pour d'autres besoins (exports, rapports, etc.) mais ce n'est pas requis pour l'upload de base.

---

### 3. CsvService

**Responsabilité** : Parser et valider les CSV

```typescript
@Injectable()
export class CsvService {
  async parseCsv(csvPath: string): Promise<any[]> {
    const fullPath = path.join(process.env.UPLOAD_DIR, csvPath);
    const csvData = await fs.promises.readFile(fullPath, 'utf-8');

    // Parser le CSV
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(';');
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(';');
      const row: any = { _lineNumber: index + 2 }; // +2 car ligne 1 = headers
      
      headers.forEach((header, i) => {
        row[header.trim()] = values[i]?.trim() || '';
      });
      
      return row;
    });

    return data;
  }
}
```

---

## 🔒 SÉCURITÉ

### Validations obligatoires

1. **Extension .xlsm uniquement**
   ```typescript
   if (!excelFile.originalname.endsWith('.xlsm')) {
     throw new BadRequestException('Seuls les fichiers .xlsm sont autorisés');
   }
   ```

2. **Type MIME réel** (pas juste l'extension)
   ```typescript
   import * as fileType from 'file-type';
   
   const type = await fileType.fromBuffer(excelFile.buffer);
   if (!type?.mime.includes('excel') && !type?.mime.includes('ms-excel')) {
     throw new BadRequestException('Type de fichier invalide (pas un fichier Excel)');
   }
   ```

3. **Taille maximum**
   ```typescript
   if (excelFile.size > 10 * 1024 * 1024) {
     throw new BadRequestException('Fichier Excel trop volumineux (max 10MB)');
   }
   
   if (csvFile.size > 10 * 1024 * 1024) {
     throw new BadRequestException('Fichier CSV trop volumineux (max 10MB)');
   }
   ```

4. **Présence des deux fichiers**
   ```typescript
   if (!files.excelFile || !files.csvFile) {
     throw new BadRequestException('Les deux fichiers (.xlsm et .csv) sont requis');
   }
   ```

3. **Scan antivirus (optionnel mais recommandé)**
   ```typescript
   const isSafe = await this.antivirusService.scan(file.buffer);
   if (!isSafe) {
     throw new BadRequestException('Fichier potentiellement dangereux détecté');
   }
   ```

4. **Rate limiting**
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Throttle(5, 60) // 5 uploads par minute
   @Post('excel')
   async uploadExcel(...) { }
   ```

---

## 📊 LOGS ET AUDIT

### Logs à enregistrer

```typescript
this.logger.log({
  action: 'UPLOAD_EXCEL',
  user: req.user.email,
  codeCellule: uploadDto.codeCellule,
  fileName: file.originalname,
  fileSize: file.size,
  ip: req.ip,
  timestamp: new Date(),
});
```

---

## 🧪 TESTS RECOMMANDÉS

### Tests unitaires

```typescript
describe('StorageService', () => {
  it('devrait stocker un fichier Excel', async () => {
    const file = createMockFile('test.xlsx', 'excel');
    const path = await storageService.storeExcelFile({
      file,
      codeCellule: 'ABJA',
    });
    expect(path).toContain('excel/');
  });
});
```

### Tests d'intégration

```typescript
describe('POST /api/v1/upload/excel', () => {
  it('devrait uploader un fichier Excel valide', async () => {
    const response = await request(app)
      .post('/api/v1/upload/excel')
      .attach('file', 'test-files/valid.xlsx')
      .field('codeCellule', 'ABJA')
      .expect(201);
      
    expect(response.body).toHaveProperty('id');
    expect(response.body.statut).toBe('N');
  });
  
  it('devrait rejeter un fichier > 10MB', async () => {
    await request(app)
      .post('/api/v1/upload/excel')
      .attach('file', 'test-files/large.xlsx')
      .field('codeCellule', 'ABJA')
      .expect(400);
  });
});
```

---

## 📋 CHECKLIST BACKEND

- [ ] Créer le dossier uploads (chemin de votre choix) avec permissions
- [ ] Créer `StorageService`
  - [ ] Méthode `storeExcelFile()` pour fichiers .xlsm
  - [ ] Méthode `storeCsvFile()` pour fichiers .csv
- [ ] Créer `CsvService` (parser)
- [ ] Modifier endpoint `POST /api/v1/upload/excel`
  - [ ] Accepter 2 fichiers (excelFile + csvFile)
  - [ ] Validation .xlsm uniquement
  - [ ] Stockage des deux fichiers
- [ ] Créer endpoint `POST /api/v1/upload/cels`
- [ ] Créer endpoint `POST /api/v1/upload/consolidation`
- [ ] Ajouter validations
  - [ ] Extension .xlsm obligatoire
  - [ ] Type MIME réel
  - [ ] Taille max 10MB (les 2 fichiers)
  - [ ] Présence des 2 fichiers
- [ ] Ajouter rate limiting
- [ ] Ajouter logs d'audit
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation OpenAPI/Swagger

### ⚠️ Notes importantes

- ✅ **Pas besoin de librairie xlsx** (conversion faite par le frontend)
- ✅ **Accepter UNIQUEMENT .xlsm** (pas .xlsx, .xls)
- ✅ **Recevoir 2 fichiers simultanément** (excelFile et csvFile)
- ✅ **Stocker les 2 fichiers** (pour archivage et traitement)

---

## 🔗 COORDINATION FRONTEND

### Ce que le frontend envoie

```typescript
// FormData avec 2 fichiers
excelFile: File (.xlsm uniquement)
csvFile: File (.csv converti par le frontend)
codeCellule: string
nomFichier?: string
nombreBv?: number
```

### Ce que le backend retourne

```typescript
{
  id: string;
  codeCellule: string;
  nomFichier: string;
  statut: 'N' | 'I' | 'P';
  message: string;
}
```

---

**Créé le** : 9 octobre 2025  
**Destinataires** : Équipe Backend NestJS  
**Version** : 1.0

