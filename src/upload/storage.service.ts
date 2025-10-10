import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as crypto from 'crypto';

/**
 * 🗂️ Service de gestion du stockage des fichiers
 * 
 * Structure de stockage:
 * /uploads/
 *   ├── [fichiers existants]  - Fichiers legacy (restent intacts)
 *   ├── excel/      - Fichiers .xlsm originaux (nouveau)
 *   ├── csv/        - Fichiers CSV convertis (nouveau)
 *   ├── cels/       - Fichiers CEL signés (nouveau)
 *   └── consolidation/ - Fichiers de consolidation (nouveau)
 * 
 * Organisation par date: {type}/{année}/{mois}/fichier
 * 
 * ⚠️ Note: Les fichiers existants à la racine de /uploads ne sont pas affectés
 * par cette nouvelle structure. Ils restent accessibles via les méthodes legacy.
 */
@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor() {
    // Récupérer le chemin depuis les variables d'environnement ou utiliser le défaut
    this.uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  }

  /**
   * Initialise la structure de dossiers et nettoie les fichiers legacy
   * 
   * @param cleanLegacy - Supprimer les fichiers legacy (défaut: true)
   */
  async initializeDirectories(cleanLegacy: boolean = true): Promise<void> {
    // S'assurer que le dossier uploads existe
    try {
      await fs.mkdir(this.uploadDir, { recursive: true, mode: 0o750 });
      console.log(`✅ Dossier uploads vérifié: ${this.uploadDir}`);
    } catch (error) {
      console.warn(`⚠️ Avertissement lors de la vérification du dossier uploads:`, error);
    }

    // Créer les sous-dossiers de la nouvelle structure
    const directories = ['excel', 'csv', 'cels', 'consolidation'];
    
    for (const dir of directories) {
      const fullPath = path.join(this.uploadDir, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true, mode: 0o750 });
        console.log(`✅ Sous-dossier créé/vérifié: ${dir}/`);
      } catch (error) {
        console.warn(`⚠️ Avertissement lors de la création du dossier ${fullPath}:`, error);
      }
    }

    // Nettoyer les fichiers legacy si demandé
    if (cleanLegacy) {
      const legacyFiles = await this.listLegacyFiles();
      if (legacyFiles.length > 0) {
        console.log(`🗑️ Nettoyage de ${legacyFiles.length} fichier(s) legacy...`);
        const result = await this.deleteLegacyFiles();
        if (result.errors.length > 0) {
          console.warn(`⚠️ ${result.errors.length} erreur(s) lors du nettoyage`);
        }
      } else {
        console.log('✅ Aucun fichier legacy à supprimer');
      }
    }
  }

  /**
   * 📥 Stocker un fichier Excel (.xlsm)
   * 
   * @param params - Paramètres du fichier à stocker
   * @returns Chemin relatif du fichier stocké
   */
  async storeExcelFile(params: {
    file: Express.Multer.File;
    codeCellule: string;
    nomFichier?: string;
  }): Promise<string> {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Créer la structure de dossiers: excel/JJ/MM/YYYY
    const dir = path.join(this.uploadDir, 'excel', day, month, String(year));
    await fs.mkdir(dir, { recursive: true, mode: 0o750 });

    // Générer un nom de fichier convivial et sécurisé
    const timeStr = `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`;
    const baseName = params.nomFichier 
      ? this.sanitizeFilename(params.nomFichier)
      : this.sanitizeFilename(params.file.originalname);
    
    // Format: CEL_ABJA_09-10-2025_14h30_Transmission.xlsm
    const fileName = `CEL_${params.codeCellule}_${day}-${month}-${year}_${timeStr}_${baseName}`;
    
    // Chemin complet du fichier
    const filePath = path.join(dir, fileName);
    
    // Vérifier la sécurité du chemin (éviter path traversal)
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new InternalServerErrorException('Chemin de fichier invalide');
    }

    // Écrire le fichier avec permissions restrictives
    await fs.writeFile(filePath, params.file.buffer, { mode: 0o640 });
    
    console.log(`✅ Fichier Excel stocké: ${fileName}`);
    
    // Retourner le chemin relatif
    return path.join('excel', day, month, String(year), fileName);
  }

  /**
   * 📄 Stocker un fichier CSV
   * 
   * @param params - Paramètres du fichier à stocker
   * @returns Chemin relatif du fichier stocké
   */
  async storeCsvFile(params: {
    file: Express.Multer.File;
    codeCellule: string;
    nomFichier?: string;
  }): Promise<string> {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Créer la structure de dossiers: csv/JJ/MM/YYYY
    const dir = path.join(this.uploadDir, 'csv', day, month, String(year));
    await fs.mkdir(dir, { recursive: true, mode: 0o750 });

    // Générer un nom de fichier convivial et sécurisé
    const timeStr = `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`;
    
    // S'assurer que le nom se termine par .csv
    let baseName = params.nomFichier 
      ? this.sanitizeFilename(params.nomFichier)
      : this.sanitizeFilename(params.file.originalname);
    
    if (!baseName.toLowerCase().endsWith('.csv')) {
      baseName = baseName.replace(/\.[^.]+$/, '.csv'); // Remplacer l'extension
    }
    
    // Format: CEL_ABJA_09-10-2025_14h30_Donnees.csv
    const fileName = `CEL_${params.codeCellule}_${day}-${month}-${year}_${timeStr}_${baseName}`;
    
    // Chemin complet du fichier
    const filePath = path.join(dir, fileName);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new InternalServerErrorException('Chemin de fichier invalide');
    }

    // Écrire le fichier avec permissions restrictives
    await fs.writeFile(filePath, params.file.buffer, { mode: 0o640 });
    
    console.log(`✅ Fichier CSV stocké: ${fileName}`);
    
    // Retourner le chemin relatif
    return path.join('csv', day, month, String(year), fileName);
  }

  /**
   * 📋 Stocker un fichier CEL signé (PDF, image)
   * 
   * @param params - Paramètres du fichier à stocker
   * @returns Chemin relatif du fichier stocké
   */
  async storeCelFile(params: {
    file: Express.Multer.File;
    celCode: string;
    celId: string;
  }): Promise<string> {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Créer la structure de dossiers: cels/{codeCel}/JJ/MM/YYYY
    const dir = path.join(this.uploadDir, 'cels', params.celCode, day, month, String(year));
    await fs.mkdir(dir, { recursive: true, mode: 0o750 });

    // Générer un nom de fichier convivial et sécurisé
    const timeStr = `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`;
    const extension = path.extname(params.file.originalname);
    
    // Format: CEL_SIGNE_ABJA_09-10-2025_14h30.pdf
    const fileName = `CEL_SIGNE_${params.celCode}_${day}-${month}-${year}_${timeStr}${extension}`;
    
    // Chemin complet du fichier
    const filePath = path.join(dir, fileName);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new InternalServerErrorException('Chemin de fichier invalide');
    }

    // Écrire le fichier avec permissions restrictives
    await fs.writeFile(filePath, params.file.buffer, { mode: 0o640 });
    
    console.log(`✅ Fichier CEL stocké: ${fileName}`);
    
    // Retourner le chemin relatif
    return path.join('cels', params.celCode, day, month, String(year), fileName);
  }

  /**
   * 📦 Stocker un fichier de consolidation
   * 
   * @param params - Paramètres du fichier à stocker
   * @returns Chemin relatif du fichier stocké
   */
  async storeConsolidationFile(params: {
    file: Express.Multer.File;
    reference: string; // Référence du fichier (ex: département, région)
    type?: string; // Type de consolidation (optionnel)
  }): Promise<string> {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Créer la structure de dossiers: consolidation/JJ/MM/YYYY
    const dir = path.join(this.uploadDir, 'consolidation', day, month, String(year));
    await fs.mkdir(dir, { recursive: true, mode: 0o750 });

    // Générer un nom de fichier convivial et sécurisé
    const timeStr = `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`;
    const extension = path.extname(params.file.originalname);
    const typePrefix = params.type ? `${this.sanitizeFilename(params.type)}_` : '';
    
    // Format: CONSOLIDATION_DEPT_001_09-10-2025_14h30.xlsx
    const fileName = `CONSOLIDATION_${typePrefix}${params.reference}_${day}-${month}-${year}_${timeStr}${extension}`;
    
    // Chemin complet du fichier
    const filePath = path.join(dir, fileName);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new InternalServerErrorException('Chemin de fichier invalide');
    }

    // Écrire le fichier avec permissions restrictives
    await fs.writeFile(filePath, params.file.buffer, { mode: 0o640 });
    
    console.log(`✅ Fichier de consolidation stocké: ${fileName}`);
    
    // Retourner le chemin relatif
    return path.join('consolidation', day, month, String(year), fileName);
  }

  /**
   * 📂 Récupérer un fichier stocké
   * 
   * @param relativePath - Chemin relatif du fichier (peut être legacy ou structuré)
   * @returns Buffer du fichier
   * 
   * Exemples:
   * - Nouveau: 'csv/2025/01/fichier.csv'
   * - Legacy: 'fichier.csv' (à la racine de uploads)
   */
  async getFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, relativePath);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new NotFoundException('Chemin de fichier invalide');
    }

    // Vérifier que le fichier existe
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException('Fichier non trouvé');
    }

    // Lire et retourner le fichier
    return fs.readFile(fullPath);
  }

  /**
   * 📂 Récupérer un fichier legacy (à la racine de /uploads)
   * 
   * @param filename - Nom du fichier
   * @returns Buffer du fichier
   */
  async getLegacyFile(filename: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filename);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new NotFoundException('Chemin de fichier invalide');
    }

    // S'assurer que c'est bien un fichier à la racine (pas dans un sous-dossier)
    const relativePath = path.relative(this.uploadDir, normalizedPath);
    if (relativePath.includes(path.sep)) {
      throw new NotFoundException('Ce n\'est pas un fichier legacy');
    }

    // Vérifier que le fichier existe
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException('Fichier legacy non trouvé');
    }

    // Lire et retourner le fichier
    return fs.readFile(fullPath);
  }

  /**
   * 📋 Lister les fichiers legacy (à la racine de /uploads)
   * 
   * @returns Liste des noms de fichiers legacy
   */
  async listLegacyFiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.uploadDir, { withFileTypes: true });
      
      // Retourner uniquement les fichiers (pas les dossiers) à la racine
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      console.error('Erreur lors de la liste des fichiers legacy:', error);
      return [];
    }
  }

  /**
   * 🗑️ Supprimer tous les fichiers legacy (à la racine de /uploads)
   * ⚠️ ATTENTION : Cette action est irréversible
   * 
   * @returns Nombre de fichiers supprimés
   */
  async deleteLegacyFiles(): Promise<{ deleted: number; errors: string[] }> {
    const legacyFiles = await this.listLegacyFiles();
    let deleted = 0;
    const errors: string[] = [];

    console.log(`🗑️ Suppression de ${legacyFiles.length} fichier(s) legacy...`);

    for (const filename of legacyFiles) {
      try {
        const fullPath = path.join(this.uploadDir, filename);
        await fs.unlink(fullPath);
        deleted++;
        console.log(`  ✅ Supprimé: ${filename}`);
      } catch (error) {
        const errorMsg = `Erreur lors de la suppression de ${filename}: ${error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log(`✅ Suppression terminée: ${deleted}/${legacyFiles.length} fichiers supprimés`);
    return { deleted, errors };
  }

  /**
   * 📊 Récupérer les informations d'un fichier
   * 
   * @param relativePath - Chemin relatif du fichier
   * @returns Informations du fichier
   */
  async getFileInfo(relativePath: string): Promise<{
    exists: boolean;
    size?: number;
    createdAt?: Date;
    modifiedAt?: Date;
  }> {
    const fullPath = path.join(this.uploadDir, relativePath);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      return { exists: false };
    }

    try {
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * 🗑️ Supprimer un fichier
   * 
   * @param relativePath - Chemin relatif du fichier
   * @returns true si suppression réussie
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, relativePath);
    
    // Vérifier la sécurité du chemin
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      throw new InternalServerErrorException('Chemin de fichier invalide');
    }

    try {
      await fs.unlink(fullPath);
      console.log(`🗑️ Fichier supprimé: ${relativePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression du fichier ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * 🧹 Nettoyer un nom de fichier (supprimer caractères dangereux)
   * 
   * @param filename - Nom de fichier à nettoyer
   * @returns Nom de fichier sécurisé
   */
  private sanitizeFilename(filename: string): string {
    // Remplacer les caractères dangereux par des underscores
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200); // Limiter la longueur
  }

  /**
   * 📁 Obtenir le chemin complet du répertoire d'upload
   */
  getUploadDirectory(): string {
    return this.uploadDir;
  }

  /**
   * 📊 Récupérer les statistiques de stockage
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    const types = ['excel', 'csv', 'cels', 'consolidation'];
    const stats = {
      totalSize: 0,
      fileCount: 0,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    for (const type of types) {
      const typePath = path.join(this.uploadDir, type);
      
      try {
        const typeStats = await this.calculateDirectorySize(typePath);
        stats.totalSize += typeStats.size;
        stats.fileCount += typeStats.count;
        stats.byType[type] = typeStats;
      } catch (error) {
        stats.byType[type] = { count: 0, size: 0 };
      }
    }

    return stats;
  }

  /**
   * Calculer la taille d'un répertoire (récursif)
   */
  private async calculateDirectorySize(dirPath: string): Promise<{ count: number; size: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subStats = await this.calculateDirectorySize(fullPath);
          totalSize += subStats.size;
          fileCount += subStats.count;
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      // Ignorer les erreurs (dossier n'existe pas, etc.)
    }

    return { count: fileCount, size: totalSize };
  }
}

