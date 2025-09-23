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
  ParseEnumPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadExcelDto, ExcelImportResponseDto, ExcelImportListResponseDto, ExcelImportStatsDto, ImportStatus } from './dto/upload-excel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as path from 'path';
import * as fs from 'fs';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}


  /**
   * Upload et traitement d'un fichier Excel
   */
  @Post('excel')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined, // Utiliser la mémoire pour avoir accès au buffer
    fileFilter: (req, file, callback) => {
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
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadExcelDto,
    @CurrentUser() user: any
  ): Promise<ExcelImportResponseDto> {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Sauvegarder le fichier
    if (!file.buffer) {
      throw new Error('Impossible de lire le contenu du fichier');
    }
    fs.writeFileSync(filePath, file.buffer);

    try {
      // Traiter le fichier
      const result = await this.uploadService.processExcelFile(filePath, uploadDto, user.id);
      
      // Nettoyer le fichier temporaire
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return result;
    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
  ): Promise<ExcelImportListResponseDto> {
    return this.uploadService.getImports(page, limit, user.id, user.role);
  }

  /**
   * Récupérer les statistiques des imports
   */
  @Get('stats')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getStats(@CurrentUser() user: any): Promise<ExcelImportStatsDto> {
    return this.uploadService.getImportStats(user.id, user.role);
  }

  /**
   * Récupérer les imports d'une CEL spécifique
   */
  @Get('imports/cel/:codeCellule')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getImportsByCel(
    @Query('codeCellule') codeCellule: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
  ): Promise<ExcelImportListResponseDto> {
    return this.uploadService.getImports(page, limit, user.id, user.role);
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
    return this.uploadService.getImports(page, limit, user.id, user.role);
  }
}
