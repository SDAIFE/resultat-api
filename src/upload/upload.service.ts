import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExcelAnalyzerService } from './excel-analyzer.service';
import { CsvAnalyzerService } from './csv-analyzer.service';
import { UploadExcelDto, ExcelImportResponseDto, ExcelImportListResponseDto, ExcelImportStatsDto, ImportStatus, CelDataResponseDto, CelDataDto, CelMetricsDto } from './dto/upload-excel.dto';
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
   * Récupère les informations d'une CEL
   */
  async getCelInfo(codeCellule: string): Promise<{ codeCellule: string; libelleCellule: string } | null> {
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
      select: {
        codeCellule: true,
        libelleCellule: true
      }
    });
    
    return cel;
  }

  /**
   * Traite un fichier Excel ou CSV uploadé
   */
  async processExcelFile(
    filePath: string,
    uploadDto: UploadExcelDto,
    userId: string
  ): Promise<ExcelImportResponseDto> {
    const { codeCellule, nombreBv } = uploadDto;

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
      
      // Valider les données avec contrôles stricts
      const validation = await this.validateExcelData(analysis.dataRows, mapping);
      
      if (!validation.isValid) {
        // Construire un message d'erreur détaillé
        let errorMessage = 'Validation échouée - Erreurs détectées :\n';
        
        if (validation.colonnesManquantes.length > 0) {
          errorMessage += `\n• Colonnes manquantes : ${validation.colonnesManquantes.join(', ')}`;
        }
        
        if (validation.lignesEnErreur.length > 0) {
          errorMessage += '\n• Erreurs de saisie détectées :';
          validation.lignesEnErreur.forEach(ligne => {
            errorMessage += `\n  - Ligne ${ligne.ligne} : ${ligne.erreurs.join('; ')}`;
          });
        }
        
        errorMessage += '\n\nVeuillez corriger ces erreurs avant de réessayer l\'import.';
        
        throw new BadRequestException(errorMessage);
      }

      // Insérer directement les données dans TblImportExcelCel
      const processedData = await this.processExcelData(analysis.dataRows, mapping, codeCellule, cel.libelleCellule, userId, analysis.lieuVoteMap);

      return this.formatImportResponse(null, analysis, mapping, validation, processedData);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Valide les données Excel avec contrôles stricts
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

    // Valider chaque ligne de données avec contrôles stricts
    dataRows.forEach((row, rowIndex) => {
      const ligneErreurs: string[] = [];
      const ligneNumero = rowIndex + 13; // Ligne 13+ dans Excel (données commencent à la ligne 13)

      // Validation stricte des champs numériques
      Object.entries(mapping).forEach(([colName, mappingInfo]) => {
        const value = row[mappingInfo.index];
        
        // Validation stricte des champs numériques
        if (value && value !== '') {
          const validationError = this.validateNumericField(value, mappingInfo.field, colName);
          if (validationError) {
            ligneErreurs.push(validationError);
          }
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
    const isValid = lignesEnErreur.length === 0;

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
   * Valide un champ numérique avec détection d'erreurs de saisie
   */
  private validateNumericField(value: any, fieldName: string, columnName: string): string | null {
    const stringValue = String(value).trim();
    
    // Champs à exclure de la validation
    const excludedFields = [
      'ordre',
      'referenceLieuVote', 
      'libelleLieuVote',
      'numeroBureauVote',
      'cellulesVides',
      'statut',
      'inscritsLed',
      'void'
    ];
    
    // Si le champ est dans la liste d'exclusion, ne pas valider
    if (excludedFields.includes(fieldName)) {
      return null;
    }
    
    // Définir les champs numériques et leurs règles de validation
    const numericFields = {
      'nombreScores': { type: 'integer', allowDecimal: false },
      'populationTotale': { type: 'number', allowDecimal: true },
      'populationHommes': { type: 'number', allowDecimal: true },
      'populationFemmes': { type: 'number', allowDecimal: true },
      'personnesAstreintes': { type: 'number', allowDecimal: true },
      'votantsHommes': { type: 'number', allowDecimal: true },
      'votantsFemmes': { type: 'number', allowDecimal: true },
      'totalVotants': { type: 'number', allowDecimal: true },
      'tauxParticipation': { type: 'percentage', allowDecimal: true },
      'bulletinsNuls': { type: 'number', allowDecimal: true },
      'bulletinsBlancs': { type: 'number', allowDecimal: true },
      'suffrageExprime': { type: 'number', allowDecimal: true },
      'score1': { type: 'number', allowDecimal: true },
      'score2': { type: 'number', allowDecimal: true },
      'score3': { type: 'number', allowDecimal: true },
      'score4': { type: 'number', allowDecimal: true },
      'score5': { type: 'number', allowDecimal: true }
    };

    const fieldConfig = numericFields[fieldName];
    if (!fieldConfig) {
      return null; // Pas un champ numérique
    }

    // Détecter les caractères invalides courants
    const invalidChars = this.detectInvalidCharacters(stringValue, fieldConfig);
    if (invalidChars.length > 0) {
      const suggestions = this.generateCharacterSuggestions(invalidChars);
      return `Colonne '${columnName}' : valeur '${stringValue}' contient des caractères invalides [${invalidChars.join(', ')}]. ${suggestions}`;
    }

    // Validation spécifique selon le type
    if (fieldConfig.type === 'percentage') {
      return this.validatePercentage(stringValue, columnName);
    } else {
      return this.validateNumber(stringValue, columnName, fieldConfig.allowDecimal);
    }
  }

  /**
   * Détecte les caractères invalides dans une valeur numérique
   */
  private detectInvalidCharacters(value: string, config: any): string[] {
    const invalidChars: string[] = [];
    
    // Caractères autorisés selon le type
    let allowedPattern: RegExp;
    if (config.type === 'percentage') {
      allowedPattern = /^[0-9.,\s%-]+$/;
    } else if (config.allowDecimal) {
      allowedPattern = /^[0-9.,\s-]+$/;
    } else {
      allowedPattern = /^[0-9\s-]+$/;
    }

    // Vérifier chaque caractère
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (!allowedPattern.test(char)) {
        invalidChars.push(`'${char}'`);
      }
    }

    return invalidChars;
  }

  /**
   * Génère des suggestions de correction pour les caractères invalides
   */
  private generateCharacterSuggestions(invalidChars: string[]): string {
    const suggestions: string[] = [];
    
    invalidChars.forEach(char => {
      const cleanChar = char.replace(/'/g, '');
      switch (cleanChar.toLowerCase()) {
        case 'o':
          suggestions.push(`'${cleanChar}' → '0'`);
          break;
        case 'l':
        case 'i':
          suggestions.push(`'${cleanChar}' → '1'`);
          break;
        case 's':
          suggestions.push(`'${cleanChar}' → '5'`);
          break;
        case 'g':
          suggestions.push(`'${cleanChar}' → '6'`);
          break;
        case 'b':
          suggestions.push(`'${cleanChar}' → '8'`);
          break;
        default:
          suggestions.push(`'${cleanChar}' → caractère numérique`);
      }
    });

    return suggestions.length > 0 ? `Corrections suggérées : ${suggestions.join(', ')}` : '';
  }

  /**
   * Valide un pourcentage
   */
  private validatePercentage(value: string, columnName: string): string | null {
    // Nettoyer la valeur (enlever les espaces)
    const cleaned = value.replace(/\s/g, '');
    
    // Vérifier le format de pourcentage
    if (!/^[0-9.,%-]+$/.test(cleaned)) {
      return `Colonne '${columnName}' : format de pourcentage invalide '${value}'`;
    }

    // Extraire le nombre (enlever % et virgules)
    const numberStr = cleaned.replace(/[%,]/g, '').replace(',', '.');
    const numValue = parseFloat(numberStr);
    
    if (isNaN(numValue)) {
      return `Colonne '${columnName}' : valeur '${value}' n'est pas un pourcentage valide`;
    }

    // Vérifier la plage (0-100% généralement)
    if (numValue < 0 || numValue > 100) {
      return `Colonne '${columnName}' : pourcentage '${value}' doit être entre 0 et 100`;
    }

    return null;
  }

  /**
   * Valide un nombre
   */
  private validateNumber(value: string, columnName: string, allowDecimal: boolean): string | null {
    // Nettoyer la valeur (enlever les espaces)
    const cleaned = value.replace(/\s/g, '');
    
    // Vérifier le format numérique
    if (!/^[0-9.,-]+$/.test(cleaned)) {
      return `Colonne '${columnName}' : format numérique invalide '${value}'`;
    }

    // Remplacer les virgules par des points pour le parsing
    const normalizedValue = cleaned.replace(',', '.');
    const numValue = parseFloat(normalizedValue);
    
    if (isNaN(numValue)) {
      return `Colonne '${columnName}' : valeur '${value}' n'est pas un nombre valide`;
    }

    // Vérifier si c'est un entier quand requis
    if (!allowDecimal && !Number.isInteger(numValue)) {
      return `Colonne '${columnName}' : valeur '${value}' doit être un nombre entier`;
    }

    // Vérifier que le nombre est positif (pour la plupart des champs)
    if (numValue < 0) {
      return `Colonne '${columnName}' : valeur '${value}' doit être positive`;
    }

    return null;
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

        // Alimenter la table TblBv si les données sont complètes
        if (dataToInsert.referenceLieuVote && dataToInsert.numeroBureauVote) {
          await this.insertBureauVote(dataToInsert);
        }

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
      
      // Mettre à jour le statut des imports dans TblImportExcelCel
      await this.prisma.tblImportExcelCel.updateMany({
        where: {
          codeCellule,
          nomFichier,
          numeroUtilisateur: userId,
        },
        data: {
          statutImport: 'COMPLETED',
        },
      });
      console.log(`✅ Statut des imports mis à jour: COMPLETED pour ${lignesReussies} lignes`);
    } else if (lignesEchouees > 0) {
      // Marquer les imports comme échoués si aucune ligne n'a réussi
      await this.prisma.tblImportExcelCel.updateMany({
        where: {
          codeCellule,
          nomFichier,
          numeroUtilisateur: userId,
        },
        data: {
          statutImport: 'ERROR',
          messageErreur: `Échec de l'import: ${lignesEchouees} lignes ont échoué`,
        },
      });
      console.log(`❌ Statut des imports mis à jour: ERROR pour ${lignesEchouees} lignes`);
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
      where.numeroUtilisateur = userId;
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

    // Récupérer les données d'import pour chaque CEL
    const celCodes = cels.map(cel => cel.codeCellule);
    const importData = await this.prisma.tblImportExcelCel.findMany({
      where: {
        codeCellule: { in: celCodes }
      },
      select: {
        codeCellule: true,
        nomFichier: true,
        dateImport: true
      }
    });

    // Créer un map pour faciliter l'accès aux données d'import
    const importDataMap = new Map();
    importData.forEach(data => {
      if (!importDataMap.has(data.codeCellule)) {
        importDataMap.set(data.codeCellule, []);
      }
      importDataMap.get(data.codeCellule).push(data);
    });

    // Plus besoin de calculer le nombre de bureaux de vote
    // car il est déjà disponible dans TblCel.nombreBureauxVote

    return {
      imports: cels.map(cel => this.formatCelListResponse(cel, importDataMap)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupère les données importées d'une CEL avec métriques
   */
  async getCelData(codeCellule: string): Promise<CelDataResponseDto> {
    // Vérifier que la CEL existe
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
      select: {
        codeCellule: true,
        libelleCellule: true
      }
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    // Récupérer les données importées (exclure les champs spécifiés)
    const importData = await this.prisma.tblImportExcelCel.findMany({
      where: { codeCellule },
      select: {
        id: true,
        codeCellule: true,
        ordre: true,
        referenceLieuVote: true,
        libelleLieuVote: true,
        numeroBureauVote: true,
        populationHommes: true,
        populationFemmes: true,
        populationTotale: true,
        personnesAstreintes: true,
        votantsHommes: true,
        votantsFemmes: true,
        totalVotants: true,
        tauxParticipation: true,
        bulletinsNuls: true,
        suffrageExprime: true,
        bulletinsBlancs: true,
        score1: true,
        score2: true,
        score3: true,
        score4: true,
        score5: true
      },
      orderBy: { ordre: 'asc' }
    });

    // Calculer les métriques
    const metrics = this.calculateCelMetrics(importData);

    return {
      codeCellule: cel.codeCellule,
      libelleCellule: cel.libelleCellule,
      totalBureaux: importData.length,
      data: importData.map(item => this.formatCelDataItem(item)),
      metrics
    };
  }

  /**
   * Calcule les métriques d'une CEL
   */
  private calculateCelMetrics(data: any[]): CelMetricsDto {
    let inscritsTotal = 0;
    let inscritsHommes = 0;
    let inscritsFemmes = 0;
    let votantsTotal = 0;
    let votantsHommes = 0;
    let votantsFemmes = 0;
    let suffrageExprime = 0;

    data.forEach(item => {
      // Inscrits
      const popTotal = this.parseNumber(item.populationTotale) || 0;
      const popHommes = this.parseNumber(item.populationHommes) || 0;
      const popFemmes = this.parseNumber(item.populationFemmes) || 0;
      
      inscritsTotal += popTotal;
      inscritsHommes += popHommes;
      inscritsFemmes += popFemmes;

      // Votants
      const votTotal = this.parseNumber(item.totalVotants) || 0;
      const votHommes = this.parseNumber(item.votantsHommes) || 0;
      const votFemmes = this.parseNumber(item.votantsFemmes) || 0;
      
      votantsTotal += votTotal;
      votantsHommes += votHommes;
      votantsFemmes += votFemmes;

      // Suffrage exprimé
      suffrageExprime += this.parseNumber(item.suffrageExprime) || 0;
    });

    // Calculer le taux de participation global
    const tauxParticipation = inscritsTotal > 0 ? (votantsTotal / inscritsTotal) * 100 : 0;

    return {
      inscrits: {
        total: inscritsTotal,
        hommes: inscritsHommes,
        femmes: inscritsFemmes
      },
      votants: {
        total: votantsTotal,
        hommes: votantsHommes,
        femmes: votantsFemmes
      },
      tauxParticipation: Math.round(tauxParticipation * 100) / 100,
      suffrageExprime
    };
  }

  /**
   * Formate un élément de données de CEL
   */
  private formatCelDataItem(item: any): CelDataDto {
    return {
      id: item.id,
      codeCellule: item.codeCellule,
      ordre: item.ordre || '',
      referenceLieuVote: item.referenceLieuVote || '',
      libelleLieuVote: item.libelleLieuVote || '',
      numeroBureauVote: item.numeroBureauVote || '',
      populationHommes: item.populationHommes || '',
      populationFemmes: item.populationFemmes || '',
      populationTotale: item.populationTotale || '',
      personnesAstreintes: item.personnesAstreintes || '',
      votantsHommes: item.votantsHommes || '',
      votantsFemmes: item.votantsFemmes || '',
      totalVotants: item.totalVotants || '',
      tauxParticipation: item.tauxParticipation || '',
      bulletinsNuls: item.bulletinsNuls || '',
      suffrageExprime: item.suffrageExprime || '',
      bulletinsBlancs: item.bulletinsBlancs || '',
      score1: item.score1 || '',
      score2: item.score2 || '',
      score3: item.score3 || '',
      score4: item.score4 || '',
      score5: item.score5 || ''
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
      where.numeroUtilisateur = userId;
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
   * Subdivise le referenceLieuVote pour extraire les codes géographiques
   */
  private parseReferenceLieuVote(referenceLieuVote: string): {
    codeDepartement: string;
    codeSousPrefecture: string;
    codeCommune: string;
    codeLieuVote: string;
  } | null {
    if (!referenceLieuVote || referenceLieuVote.length < 12) {
      return null;
    }

    // Format attendu: 001001001001 (12 chiffres)
    // 001 = codeDepartement (3 premiers)
    // 001 = codeSousPrefecture (3 suivants)
    // 001 = codeCommune (3 suivants)
    // 001 = codeLieuVote (3 restants)
    
    const codeDepartement = referenceLieuVote.substring(0, 3);
    const codeSousPrefecture = referenceLieuVote.substring(3, 6);
    const codeCommune = referenceLieuVote.substring(6, 9);
    const codeLieuVote = referenceLieuVote.substring(9, 12);

    return {
      codeDepartement,
      codeSousPrefecture,
      codeCommune,
      codeLieuVote
    };
  }

  /**
   * Convertit une chaîne en nombre, retourne null si invalide
   */
  private parseNumber(value: string | null | undefined): number | null {
    if (!value || value === '') return null;
    
    // Nettoyer la valeur (enlever les virgules, espaces, etc.)
    const cleaned = value.toString().replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : Math.round(parsed);
  }

  /**
   * Convertit un pourcentage en nombre décimal
   */
  private parsePercentage(value: string | null | undefined): number | null {
    if (!value || value === '') return null;
    
    // Nettoyer la valeur (enlever le % et les espaces)
    const cleaned = value.toString().replace(/[%\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Insère un bureau de vote dans la table TblBv
   */
  private async insertBureauVote(importData: any): Promise<void> {
    try {
      // Parser le referenceLieuVote
      const geoData = this.parseReferenceLieuVote(importData.referenceLieuVote);
      if (!geoData) {
        console.warn(`Impossible de parser referenceLieuVote: ${importData.referenceLieuVote}`);
        return;
      }

      // Vérifier que le lieu de vote existe dans TblLv
      const lieuVote = await this.prisma.tblLv.findUnique({
        where: {
          codeDepartement_codeSousPrefecture_codeCommune_codeLieuVote: {
            codeDepartement: geoData.codeDepartement,
            codeSousPrefecture: geoData.codeSousPrefecture,
            codeCommune: geoData.codeCommune,
            codeLieuVote: geoData.codeLieuVote
          }
        }
      });

      if (!lieuVote) {
        console.warn(`⚠️ Lieu de vote non trouvé: ${geoData.codeDepartement}-${geoData.codeSousPrefecture}-${geoData.codeCommune}-${geoData.codeLieuVote}`);
        console.warn(`   Référence originale: ${importData.referenceLieuVote}`);
        
        // Chercher des lieux de vote similaires pour diagnostic
        const similarLv = await this.prisma.tblLv.findMany({
          where: {
            codeDepartement: geoData.codeDepartement,
            codeSousPrefecture: geoData.codeSousPrefecture,
            codeCommune: geoData.codeCommune
          },
          take: 3
        });
        
        if (similarLv.length > 0) {
          console.warn(`   Lieux de vote similaires trouvés:`);
          similarLv.forEach(lv => {
            console.warn(`     - ${lv.codeLieuVote}: ${lv.libelleLieuVote}`);
          });
        }
        
        return;
      }

      // Vérifier si le bureau de vote existe déjà
      const existingBv = await this.prisma.tblBv.findUnique({
        where: {
          codeDepartement_codeSousPrefecture_codeCommune_codeLieuVote_numeroBureauVote: {
            codeDepartement: geoData.codeDepartement,
            codeSousPrefecture: geoData.codeSousPrefecture,
            codeCommune: geoData.codeCommune,
            codeLieuVote: geoData.codeLieuVote,
            numeroBureauVote: importData.numeroBureauVote
          }
        }
      });

      if (existingBv) {
        // Mettre à jour le bureau de vote existant
        await this.prisma.tblBv.update({
          where: { id: existingBv.id },
          data: {
            inscrits: this.parseNumber(importData.populationTotale),
            populationHommes: this.parseNumber(importData.populationHommes),
            populationFemmes: this.parseNumber(importData.populationFemmes),
            personnesAstreintes: this.parseNumber(importData.personnesAstreintes),
            votantsHommes: this.parseNumber(importData.votantsHommes),
            votantsFemmes: this.parseNumber(importData.votantsFemmes),
            totalVotants: this.parseNumber(importData.totalVotants),
            tauxParticipation: this.parsePercentage(importData.tauxParticipation),
            bulletinsNuls: this.parseNumber(importData.bulletinsNuls),
            bulletinsBlancs: this.parseNumber(importData.bulletinsBlancs),
            suffrageExprime: importData.suffrageExprime
          }
        });
        console.log(`📝 Bureau de vote mis à jour: ${geoData.codeDepartement}-${geoData.codeSousPrefecture}-${geoData.codeCommune}-${geoData.codeLieuVote}-${importData.numeroBureauVote}`);
      } else {
        // Créer un nouveau bureau de vote
        await this.prisma.tblBv.create({
          data: {
            codeDepartement: geoData.codeDepartement,
            codeSousPrefecture: geoData.codeSousPrefecture,
            codeCommune: geoData.codeCommune,
            codeLieuVote: geoData.codeLieuVote,
            numeroBureauVote: importData.numeroBureauVote,
            inscrits: this.parseNumber(importData.populationTotale),
            populationHommes: this.parseNumber(importData.populationHommes),
            populationFemmes: this.parseNumber(importData.populationFemmes),
            personnesAstreintes: this.parseNumber(importData.personnesAstreintes),
            votantsHommes: this.parseNumber(importData.votantsHommes),
            votantsFemmes: this.parseNumber(importData.votantsFemmes),
            totalVotants: this.parseNumber(importData.totalVotants),
            tauxParticipation: this.parsePercentage(importData.tauxParticipation),
            bulletinsNuls: this.parseNumber(importData.bulletinsNuls),
            bulletinsBlancs: this.parseNumber(importData.bulletinsBlancs),
            suffrageExprime: importData.suffrageExprime
          }
        });
        console.log(`✅ Bureau de vote créé: ${geoData.codeDepartement}-${geoData.codeSousPrefecture}-${geoData.codeCommune}-${geoData.codeLieuVote}-${importData.numeroBureauVote}`);
      }

    } catch (error) {
      console.error(`❌ Erreur lors de l'insertion du bureau de vote:`, error);
      // Ne pas faire échouer l'import principal pour une erreur de bureau de vote
    }
  }

  /**
   * Formate la réponse de liste des CELs
   */
  private formatCelListResponse(
    cel: any, 
    importDataMap?: Map<string, any[]>
  ): ExcelImportResponseDto {
    // Récupérer les données d'import pour cette CEL
    const celImportData = importDataMap?.get(cel.codeCellule) || [];
    const totalLignesImportees = celImportData.length;
    
    // Récupérer la date d'import la plus récente
    const dateImport = celImportData.length > 0 
      ? celImportData.reduce((latest, data) => 
          data.dateImport > latest ? data.dateImport : latest, 
          celImportData[0].dateImport
        )
      : cel.updatedAt || cel.createdAt;
    
    // Utiliser le nom de la CEL comme nom de fichier
    const nomFichier = cel.libelleCellule;
    
    // Utiliser le nombre de bureaux de vote directement depuis la table TblCel
    let nombreBureauxVote = cel.nombreBureauxVote || 0;

    return {
      id: cel.id,
      codeCellule: cel.codeCellule,
      nomFichier: nomFichier,
      statutImport: cel.etatResultatCellule === 'I' ? ImportStatus.COMPLETED : 
                   cel.etatResultatCellule === 'P' ? ImportStatus.COMPLETED : 
                   ImportStatus.PENDING,
      messageErreur: undefined,
      dateImport: dateImport,
      nombreLignesImportees: totalLignesImportees,
      nombreLignesEnErreur: 0,
      nombreBureauxVote: nombreBureauxVote,
      details: {
        headers: [],
        colonnesMappees: {},
        lignesTraitees: totalLignesImportees,
        lignesReussies: totalLignesImportees,
        lignesEchouees: 0,
      },
    };
  }
}
