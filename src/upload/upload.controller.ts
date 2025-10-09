import { 
  Controller, 
  Post, 
  Get, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  ParseEnumPipe,
  Param,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadExcelDto, ExcelImportResponseDto, ExcelImportListResponseDto, ExcelImportStatsDto, ImportStatus, CelDataResponseDto } from './dto/upload-excel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as FileType from 'file-type';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

/**
   * Upload et traitement d'un fichier Excel
   * 🔒 SÉCURITÉ : 
   * - Validation des magic bytes (pas seulement MIME type)
   * - Limite de taille réduite à 10MB
   * - Noms de fichiers générés aléatoirement
   * - Validation du chemin pour éviter path traversal
   */
  @Post('excel')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined, // Utiliser la mémoire pour avoir accès au buffer
    fileFilter: (req, file, callback) => {
      // Validation basique du MIME type (sera complétée par validation magic bytes)
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
        'text/csv', // .csv
        'application/csv', // .csv
        'text/plain', // .csv (certains navigateurs)
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new Error('Type de fichier non autorisé. Seuls les fichiers Excel (.xlsx, .xls, .xlsm) et CSV (.csv) sont acceptés.'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 🔒 SÉCURITÉ : Réduit à 10MB (au lieu de 50MB)
      files: 1, // Un seul fichier à la fois
    },
  }))
  async uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadExcelDto,
    @CurrentUser() user: any,
    @Query('keepFile', new DefaultValuePipe('true')) keepFile: string
  ): Promise<ExcelImportResponseDto> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!file.buffer) {
      throw new BadRequestException('Impossible de lire le contenu du fichier');
    }

    // 🔒 SÉCURITÉ : Valider le type réel du fichier via magic bytes
    let fileType: FileType.FileTypeResult | undefined;
    try {
      fileType = await FileType.fromBuffer(file.buffer);
    } catch (error) {
      // Si la détection échoue, on continue avec la validation MIME
    }
    
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    
    // Pour CSV, fileType peut être undefined car ce n'est pas un format binaire
    // On vérifie alors le contenu via le MIME type
    if (fileType && !allowedExtensions.includes(fileType.ext)) {
      throw new BadRequestException(
        `Type de fichier invalide. Détecté: ${fileType.ext}. Seuls les fichiers Excel (.xlsx, .xls) et CSV (.csv) sont acceptés.`
      );
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Récupérer le nom de la CEL pour le nom de fichier
    const cel = await this.uploadService.getCelInfo(uploadDto.codeCellule);
    if (!cel) {
      throw new BadRequestException('CEL non trouvée');
    }
    
    // 🔒 SÉCURITÉ : Générer un nom de fichier aléatoire sécurisé
    const randomName = crypto.randomBytes(16).toString('hex');
    const fileExtension = fileType ? `.${fileType.ext}` : path.extname(file.originalname);
    const fileName = `${randomName}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // 🔒 SÉCURITÉ : Vérifier que le chemin normalisé ne sort pas du dossier uploads
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      throw new BadRequestException('Chemin de fichier invalide');
    }

    // Sauvegarder le fichier de manière sécurisée
    try {
      fs.writeFileSync(filePath, file.buffer, { mode: 0o600 }); // Permissions restrictives
    } catch (error) {
      throw new BadRequestException('Erreur lors de la sauvegarde du fichier');
    }

    try {
      // Traiter le fichier
      const result = await this.uploadService.processExcelFile(filePath, uploadDto, user.id);
      
      // Gérer la conservation du fichier selon le paramètre
      const shouldKeepFile = keepFile.toLowerCase() === 'true';
      if (shouldKeepFile) {
        console.log(`📁 Fichier sauvegardé: ${filePath}`);
      } else {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Fichier supprimé après traitement: ${filePath}`);
        }
      }

      return result;
    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur seulement
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Fichier supprimé après erreur: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Récupérer la liste des CELs importées
   */
  @Get('imports')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getImports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
    @Query('codeCellule') codeCellule?: string | string[],
  ): Promise<ExcelImportListResponseDto> {
    // Normaliser codeCellule en tableau
    const codeCellules = Array.isArray(codeCellule) ? codeCellule : (codeCellule ? [codeCellule] : undefined);
    return this.uploadService.getImports(page, limit, user.id, user.role?.code, codeCellules);
  }

  /**
   * Récupérer les statistiques des imports
   */
  @Get('stats')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getStats(@CurrentUser() user: any): Promise<ExcelImportStatsDto> {
    return this.uploadService.getImportStats(user.id, user.role?.code);
  }

  /**
   * Récupérer les imports d'une CEL spécifique
   */
  @Get('imports/cel/:codeCellule')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getImportsByCel(
    @Param('codeCellule') codeCellule: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
  ): Promise<ExcelImportListResponseDto> {
    return this.uploadService.getImports(page, limit, user.id, user.role?.code, [codeCellule]);
  }

  /**
   * Récupérer les imports par statut
   */
  @Get('imports/statut/:statut')
  @Roles('SADMIN', 'ADMIN')
  async getImportsByStatus(
    @Query('statut', new ParseEnumPipe(ImportStatus)) statut: ImportStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
  ): Promise<ExcelImportListResponseDto> {
    return this.uploadService.getImports(page, limit, user.id, user.role?.code);
  }

  /**
   * Récupérer les données importées d'une CEL avec métriques
   */
  @Get('cel/:codeCellule/data')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getCelData(
    @Param('codeCellule') codeCellule: string,
    @CurrentUser() user: any,
  ): Promise<CelDataResponseDto> {
    return this.uploadService.getCelData(codeCellule);
  }
}
