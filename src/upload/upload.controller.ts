import { 
  Controller, 
  Post, 
  Get, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  UploadedFiles,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  ParseEnumPipe,
  Param,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadExcelDto, UploadCelDto, UploadConsolidationDto, ExcelImportResponseDto, ExcelImportListResponseDto, ExcelImportStatsDto, ImportStatus, CelDataResponseDto } from './dto/upload-excel.dto';
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
   * Upload et traitement de fichiers Excel (.xlsm) + CSV
   * 🔒 SÉCURITÉ : 
   * - Validation stricte .xlsm uniquement (pas .xlsx ni .xls)
   * - Validation des magic bytes (pas seulement MIME type)
   * - Limite de taille réduite à 10MB par fichier
   * - Les 2 fichiers sont obligatoires
   * - Stockage structuré via StorageService
   */
  @Post('excel')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'excelFile', maxCount: 1 },
      { name: 'csvFile', maxCount: 1 },
    ], {
      storage: undefined, // Utiliser la mémoire pour avoir accès au buffer
      limits: {
        fileSize: 10 * 1024 * 1024, // 🔒 SÉCURITÉ : 10MB max par fichier
        files: 2, // Exactement 2 fichiers
      },
    })
  )
  async uploadExcel(
    @UploadedFiles() files: {
      excelFile?: Express.Multer.File[];
      csvFile?: Express.Multer.File[];
    },
    @Body() uploadDto: UploadExcelDto,
    @CurrentUser() user: any
  ): Promise<ExcelImportResponseDto> {
    // 1. ✅ Validation de la présence des 2 fichiers
    if (!files.excelFile || !files.excelFile[0]) {
      throw new BadRequestException('Fichier Excel (.xlsm) manquant');
    }
    
    if (!files.csvFile || !files.csvFile[0]) {
      throw new BadRequestException('Fichier CSV manquant');
    }

    const excelFile = files.excelFile[0];
    const csvFile = files.csvFile[0];

    // 2. ✅ Validation stricte : fichier Excel doit être .xlsm UNIQUEMENT
    if (!excelFile.originalname.toLowerCase().endsWith('.xlsm')) {
      throw new BadRequestException(
        'Seuls les fichiers .xlsm sont autorisés. Les fichiers .xlsx et .xls ne sont pas acceptés.'
      );
    }

    // 3. ✅ Validation des buffers
    if (!excelFile.buffer || !csvFile.buffer) {
      throw new BadRequestException('Impossible de lire le contenu des fichiers');
    }

    // 4. ✅ Validation du type MIME réel du fichier Excel via magic bytes
    let excelFileType: FileType.FileTypeResult | undefined;
    try {
      excelFileType = await FileType.fromBuffer(excelFile.buffer);
    } catch (error) {
      // Si la détection échoue, on continue avec la validation d'extension
    }
    
    // Vérifier que c'est bien un fichier Excel (types MS Office)
    if (excelFileType) {
      const validMimeTypes = [
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', // Les fichiers .xlsm sont des archives ZIP
      ];
      
      if (!validMimeTypes.includes(excelFileType.mime)) {
        throw new BadRequestException(
          `Type de fichier Excel invalide. Détecté: ${excelFileType.mime}`
        );
      }
    }

    // 5. ✅ Validation de la taille des fichiers
    if (excelFile.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier Excel trop volumineux (max 10MB)');
    }
    
    if (csvFile.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier CSV trop volumineux (max 10MB)');
    }

    // 6. ✅ Vérifier que la CEL existe
    const cel = await this.uploadService.getCelInfo(uploadDto.codeCellule);
    if (!cel) {
      throw new BadRequestException('CEL non trouvée');
    }

    try {
      // 7. ✅ Traiter les fichiers avec le service
      const result = await this.uploadService.processExcelAndCsvFiles(
        excelFile,
        csvFile,
        uploadDto,
        user.id
      );

      return result;
    } catch (error) {
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
    @Query('codeRegion') codeRegion?: string,
    @Query('codeDepartement') codeDepartement?: string,
  ): Promise<ExcelImportListResponseDto> {
    // Normaliser codeCellule en tableau
    const codeCellules = Array.isArray(codeCellule) ? codeCellule : (codeCellule ? [codeCellule] : undefined);
    return this.uploadService.getImports(page, limit, user.id, user.role?.code, codeCellules, codeRegion, codeDepartement);
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

  /**
   * Upload d'un fichier CEL signé (PDF, image)
   * 🔒 SÉCURITÉ :
   * - Types autorisés : PDF, JPG, PNG
   * - Taille max : 10MB
   * - Stockage structuré par code CEL
   */
  @Post('cels')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error('Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG'),
            false
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 1,
      },
    })
  )
  async uploadCelFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadCelDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation de la taille
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale : 10MB');
    }

    try {
      const result = await this.uploadService.processCelFile(
        file,
        uploadDto,
        user.id
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload d'un fichier de consolidation
   * 🔒 SÉCURITÉ :
   * - Types autorisés : Excel, PDF, CSV
   * - Taille max : 10MB
   * - Stockage structuré par date
   */
  @Post('consolidation')
  @Roles('SADMIN', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'application/pdf',
          'text/csv',
          'application/csv',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error('Type de fichier non autorisé. Formats acceptés : Excel, PDF, CSV'),
            false
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 1,
      },
    })
  )
  async uploadConsolidation(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadConsolidationDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation de la taille
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale : 10MB');
    }

    try {
      const result = await this.uploadService.processConsolidationFile(
        file,
        uploadDto,
        user.id
      );

      return result;
    } catch (error) {
      throw error;
    }
  }
}
