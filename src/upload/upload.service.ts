import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExcelAnalyzerService } from './excel-analyzer.service';
import { CsvAnalyzerService } from './csv-analyzer.service';
import { UploadExcelDto, ExcelImportResponseDto, ExcelImportListResponseDto, ExcelImportStatsDto, ImportStatus } from './dto/upload-excel.dto';
import { ExcelParsedDataDto, ExcelValidationResultDto } from './dto/excel-data.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private excelAnalyzer: ExcelAnalyzerService,
    private csvAnalyzer: CsvAnalyzerService,
  ) {}

  /**
   * Traite un fichier Excel ou CSV uploadé
   */
  async processExcelFile(
    filePath: string,
    uploadDto: UploadExcelDto,
    userId: string
  ): Promise<ExcelImportResponseDto> {
    const { codeCellule, nomFichier, nombreBv } = uploadDto;

    // Vérifier que la CEL existe
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Fichier non trouvé');
    }

    try {
      // Déterminer le type de fichier et analyser
      const fileExtension = path.extname(filePath).toLowerCase();
      let analysis: any;
      let mapping: any;
      
      if (fileExtension === '.csv') {
        // Analyser le fichier CSV
        analysis = await this.csvAnalyzer.analyzeCsvStructure(filePath);
        
        // Mapper les colonnes CSV
        mapping = this.csvAnalyzer.mapCsvColumnsToDbFields(analysis.headers);
        
        // Extraire les libellés des lieux de vote
        const lieuVoteMap = this.csvAnalyzer.extractLieuVoteFromData(analysis.dataRows);
        analysis.lieuVoteMap = lieuVoteMap;
      } else {
        // Analyser le fichier Excel
        analysis = await this.excelAnalyzer.analyzeCelFile(filePath, codeCellule, nombreBv);
        
        // Mapper les colonnes Excel
        mapping = this.excelAnalyzer.mapCompilCecColumnsToDbFields(analysis.headers);
      }
      
      // Valider les données
      const validation = await this.validateExcelData(analysis.dataRows, mapping);
      
      if (!validation.isValid) {
        throw new Error(`Validation échouée: ${validation.errors.join('; ')}`);
      }

      // Insérer directement les données dans TblImportExcelCel
      const processedData = await this.processExcelData(analysis.dataRows, mapping, codeCellule, nomFichier || path.basename(filePath), userId, analysis.lieuVoteMap);

      return this.formatImportResponse(null, analysis, mapping, validation, processedData);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Valide les données Excel
   */
  private async validateExcelData(
    dataRows: any[][],
    mapping: Record<string, { field: string; index: number; type: string }>
  ): Promise<ExcelValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const colonnesManquantes: string[] = [];
    const colonnesInconnues: string[] = [];
    const lignesEnErreur: Array<{ ligne: number; erreurs: string[] }> = [];

    // Vérifier les colonnes manquantes
    const requiredFields = ['ordre', 'numeroBureauVote', 'populationTotale'];
    const mappedFields = Object.values(mapping).map(m => m.field);
    
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field)) {
        colonnesManquantes.push(field);
      }
    });

    // Valider chaque ligne de données
    dataRows.forEach((row, rowIndex) => {
      const ligneErreurs: string[] = [];
      const ligneNumero = rowIndex + 13; // Ligne 13+ dans Excel

      // Vérifier les champs obligatoires
      Object.entries(mapping).forEach(([colName, mappingInfo]) => {
        const value = row[mappingInfo.index];
        
        if (mappingInfo.field === 'ordre' && (!value || value === '')) {
          ligneErreurs.push(`Ordre manquant`);
        }
        
        if (mappingInfo.field === 'numeroBureauVote' && (!value || value === '')) {
          ligneErreurs.push(`Numéro de bureau de vote manquant`);
        }
      });

      if (ligneErreurs.length > 0) {
        lignesEnErreur.push({
          ligne: ligneNumero,
          erreurs: ligneErreurs,
        });
      }
    });

    // Déterminer si la validation est réussie
    const isValid = colonnesManquantes.length === 0 && lignesEnErreur.length === 0;

    return {
      isValid,
      errors,
      warnings,
      colonnesManquantes,
      colonnesInconnues,
      lignesEnErreur,
    };
  }

  /**
   * Traite les données Excel/CSV et les prépare pour l'insertion
   */
  private async processExcelData(
    dataRows: any[][],
    mapping: Record<string, { field: string; index: number; type: string }>,
    codeCellule: string,
    nomFichier: string,
    userId: string,
    lieuVoteMap?: Record<string, string>
  ): Promise<{ lignesTraitees: number; lignesReussies: number; lignesEchouees: number; codeCellule: string; nomFichier: string }> {
    let lignesTraitees = 0;
    let lignesReussies = 0;
    let lignesEchouees = 0;

    // Vérifier et supprimer les données existantes pour ce codeCellule
    const existingData = await this.prisma.tblImportExcelCel.findMany({
      where: { codeCellule }
    });

    if (existingData.length > 0) {
      console.log(`🗑️  Suppression de ${existingData.length} enregistrements existants pour la CEL ${codeCellule}`);
      await this.prisma.tblImportExcelCel.deleteMany({
        where: { codeCellule }
      });
      console.log(`✅ Suppression terminée pour la CEL ${codeCellule}`);
    }

    for (const row of dataRows) {
      lignesTraitees++;
      
      try {
        const dataToInsert: any = {
          codeCellule,
          nomFichier,
          numeroUtilisateur: userId,
        };

        // Mapper chaque colonne
        Object.entries(mapping).forEach(([colName, mappingInfo]) => {
          const value = row[mappingInfo.index];
          
          if (mappingInfo.type === 'split' && colName.includes('CEC')) {
            // Traitement spécial pour la colonne CEC (Excel)
            const celInfo = this.excelAnalyzer.extractCelInfoFromCecColumn(value);
            dataToInsert.referenceLieuVote = celInfo.referenceLieuVote;
            dataToInsert.libelleLieuVote = celInfo.libelleLieuVote;
          } else {
            // Mapping direct
            dataToInsert[mappingInfo.field] = value ? String(value) : null;
          }
        });

        // Pour les fichiers CSV, ajouter le libellé du lieu de vote si disponible
        if (lieuVoteMap && dataToInsert.referenceLieuVote) {
          dataToInsert.libelleLieuVote = lieuVoteMap[dataToInsert.referenceLieuVote] || dataToInsert.libelleLieuVote;
        }

        // Insérer dans la base de données
        await this.prisma.tblImportExcelCel.create({
          data: dataToInsert,
        });

        lignesReussies++;
      } catch (error) {
        lignesEchouees++;
        console.error(`Erreur lors du traitement de la ligne ${lignesTraitees}:`, error);
      }
    }

    // Mettre à jour le statut de la CEL après l'import
    if (lignesReussies > 0) {
      await this.prisma.tblCel.update({
        where: { codeCellule },
        data: {
          etatResultatCellule: 'I', // I: Importé
        },
      });
      console.log(`✅ Statut de la CEL ${codeCellule} mis à jour: I (Importé)`);
    }

    return { lignesTraitees, lignesReussies, lignesEchouees, codeCellule, nomFichier };
  }

  /**
   * Récupère la liste des CELs importées (statut I ou P)
   */
  async getImports(
    page: number = 1,
    limit: number = 10,
    userId: string,
    userRole: string
  ): Promise<ExcelImportListResponseDto> {
    const skip = (page - 1) * limit;
    
    // Construire la condition WHERE selon le rôle
    const where: any = {
      etatResultatCellule: {
        in: ['I', 'P'] // Seulement les CELs importées ou publiées
      }
    };

    // Pour USER : seulement ses CELs assignées
    if (userRole === 'USER') {
      where.utilisateur = {
        some: {
          numeroUtilisateur: userId
        }
      };
    }
    // Pour ADMIN et SADMIN : toutes les CELs

    const [cels, total] = await Promise.all([
      this.prisma.tblCel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codeCellule: 'asc' },
        include: {
          utilisateur: true, // Inclure les infos de l'utilisateur assigné
          _count: {
            select: {
              lieuxVote: true // Compter les lieux de vote
            }
          }
        },
      }),
      this.prisma.tblCel.count({ where }),
    ]);

    return {
      imports: cels.map(cel => this.formatCelListResponse(cel)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupère les statistiques des CELs
   */
  async getImportStats(userId?: string, userRole?: string): Promise<ExcelImportStatsDto> {
    // Construire la condition WHERE selon le rôle
    const where: any = {};
    
    // Pour USER : seulement ses CELs assignées
    if (userRole === 'USER' && userId) {
      where.utilisateur = {
        some: {
          numeroUtilisateur: userId
        }
      };
    }
    // Pour ADMIN et SADMIN : toutes les CELs (pas de filtre)

    const [
      totalCels,
      celsImportees,
      celsEnAttente,
      celsParStatut,
    ] = await Promise.all([
      this.prisma.tblCel.count({ where }), // Total des CELs
      this.prisma.tblCel.count({ 
        where: { 
          ...where,
          etatResultatCellule: { in: ['I', 'P'] } 
        } 
      }), // CELs importées ou publiées
      this.prisma.tblCel.count({ 
        where: { 
          ...where,
          etatResultatCellule: { notIn: ['I', 'P'] } 
        } 
      }), // CELs en attente
      this.prisma.tblCel.groupBy({
        by: ['etatResultatCellule'],
        where,
        _count: { etatResultatCellule: true },
      }),
    ]);

    const tauxImport = totalCels > 0 ? (celsImportees / totalCels) * 100 : 0;

    return {
      totalImports: totalCels,
      importsReussis: celsImportees,
      importsEnErreur: 0, // Pas d'erreurs au niveau CEL
      importsEnCours: celsEnAttente,
      totalLignesImportees: celsImportees,
      totalLignesEnErreur: 0,
      tauxReussite: Math.round(tauxImport * 100) / 100,
      importsParCel: {}, // Pas utilisé pour les CELs
      importsParStatut: celsParStatut.reduce((acc, item) => {
        acc[item.etatResultatCellule as any] = item._count.etatResultatCellule;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Formate la réponse d'import
   */
  private formatImportResponse(
    importRecord: any,
    analysis: any,
    mapping: any,
    validation: any,
    processedData?: any
  ): ExcelImportResponseDto {
    // Si pas d'enregistrement d'import (insertion directe), créer une réponse basée sur les données traitées
    if (!importRecord) {
      return {
        id: 'direct-insertion',
        codeCellule: processedData?.codeCellule || 'unknown',
        nomFichier: processedData?.nomFichier || 'unknown',
        statutImport: ImportStatus.COMPLETED,
        messageErreur: undefined,
        dateImport: new Date(),
        nombreLignesImportees: processedData?.lignesReussies || 0,
        nombreLignesEnErreur: processedData?.lignesEchouees || 0,
        details: {
          headers: analysis.headers,
          colonnesMappees: Object.fromEntries(
            Object.entries(mapping).map(([key, value]: [string, any]) => [key, value.field])
          ),
          lignesTraitees: processedData?.lignesTraitees || 0,
          lignesReussies: processedData?.lignesReussies || 0,
          lignesEchouees: processedData?.lignesEchouees || 0,
        },
      };
    }

    return {
      id: importRecord.id,
      codeCellule: importRecord.codeCellule,
      nomFichier: importRecord.nomFichier,
      statutImport: importRecord.statutImport as ImportStatus,
      messageErreur: importRecord.messageErreur,
      dateImport: importRecord.dateImport,
      nombreLignesImportees: processedData?.lignesReussies || 0,
      nombreLignesEnErreur: processedData?.lignesEchouees || 0,
      details: {
        headers: analysis.headers,
        colonnesMappees: Object.fromEntries(
          Object.entries(mapping).map(([key, value]: [string, any]) => [key, value.field])
        ),
        lignesTraitees: processedData?.lignesTraitees || 0,
        lignesReussies: processedData?.lignesReussies || 0,
        lignesEchouees: processedData?.lignesEchouees || 0,
      },
    };
  }

  /**
   * Formate la réponse de liste d'imports
   */
  private formatImportListResponse(importRecord: any): ExcelImportResponseDto {
    return {
      id: importRecord.id,
      codeCellule: importRecord.codeCellule,
      nomFichier: importRecord.nomFichier,
      statutImport: importRecord.statutImport as ImportStatus,
      messageErreur: importRecord.messageErreur,
      dateImport: importRecord.dateImport,
      nombreLignesImportees: 0, // À calculer si nécessaire
      nombreLignesEnErreur: 0, // À calculer si nécessaire
      details: {
        headers: [],
        colonnesMappees: {},
        lignesTraitees: 0,
        lignesReussies: 0,
        lignesEchouees: 0,
      },
    };
  }

  /**
   * Formate la réponse de liste des CELs
   */
  private formatCelListResponse(cel: any): ExcelImportResponseDto {
    return {
      id: cel.id,
      codeCellule: cel.codeCellule,
      nomFichier: cel.libelleCellule,
      statutImport: cel.etatResultatCellule === 'I' ? ImportStatus.COMPLETED : 
                   cel.etatResultatCellule === 'P' ? ImportStatus.COMPLETED : 
                   ImportStatus.PENDING,
      messageErreur: undefined,
      dateImport: cel.updatedAt || cel.createdAt,
      nombreLignesImportees: cel._count?.lieuxVote || 0,
      nombreLignesEnErreur: 0,
      details: {
        headers: [],
        colonnesMappees: {},
        lignesTraitees: cel._count?.lieuxVote || 0,
        lignesReussies: cel._count?.lieuxVote || 0,
        lignesEchouees: 0,
      },
    };
  }
}
