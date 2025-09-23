import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as path from 'path';

@Injectable()
export class ExcelAnalyzerService {
  
  /**
   * Analyse la structure d'un fichier Excel pour comprendre les colonnes disponibles
   */
  async analyzeExcelStructure(filePath: string): Promise<{
    sheetNames: string[];
    columns: string[];
    sampleData: any[];
    totalRows: number;
  }> {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetNames[0]];
      
      // Convertir en JSON pour analyser
      const jsonData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      
      // Première ligne = en-têtes
      const headers = jsonData[0] as string[];
      
      // Données d'exemple (2-3 premières lignes de données)
      const sampleData = jsonData.slice(1, 4).filter((row: any[]) => row && Array.isArray(row) && row.length > 0);
      
      return {
        sheetNames,
        columns: headers,
        sampleData,
        totalRows: jsonData.length - 1 // Exclure l'en-tête
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse du fichier Excel: ${error.message}`);
    }
  }

  /**
   * Valide que le nom du fichier correspond au code de la CEL
   */
  validateFileName(fileName: string, celCode: string): boolean {
    const fileNameWithoutExt = path.parse(fileName).name;
    return fileNameWithoutExt.toUpperCase().includes(celCode.toUpperCase());
  }

  /**
   * Extrait les données d'une plage spécifique du fichier Excel
   */
  async extractDataFromRange(
    filePath: string, 
    startRow: number, 
    endRow: number,
    sheetName?: string
  ): Promise<any[]> {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
      
      // Convertir en JSON
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Extraire la plage demandée
      return jsonData.slice(startRow - 1, endRow);
    } catch (error) {
      throw new Error(`Erreur lors de l'extraction des données: ${error.message}`);
    }
  }

  /**
   * Mappe les colonnes Excel vers les champs de la base de données
   */
  mapExcelColumnsToDbFields(excelColumns: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    // Mapping basé sur les colonnes attendues
    const columnMappings = {
      'ORD': 'ordre',
      'REF_LV': 'referenceLieuVote',
      'LIB_LV': 'libelleLieuVote',
      'NUMERO_BV': 'numeroBureauVote',
      'POP_HOM': 'populationHommes',
      'POP_FEM': 'populationFemmes',
      'POP_TOTAL': 'populationTotale',
      'PERS_ASTR': 'personnesAstreintes',
      'VOT_HOM': 'votantsHommes',
      'VOT_FEM': 'votantsFemmes',
      'TOTAL_VOT': 'totalVotants',
      'TAUX_PART': 'tauxParticipation',
      'BUL_NUL': 'bulletinsNuls',
      'BUL_BLANC': 'bulletinsBlancs',
      'SUF_EXP': 'suffrageExprime',
      'SCORE_1': 'score1',
      'SCORE_2': 'score2',
      'SCORE_3': 'score3',
      'SCORE_4': 'score4',
      'SCORE_5': 'score5',
      'SCORE_6': 'score6',
      'SCORE_7': 'score7',
      'SCORE_8': 'score8',
      'SCORE_9': 'score9',
      'SCORE_10': 'score10',
      '[0]': 'colonneZero'
    };

    // Mapper les colonnes trouvées
    excelColumns.forEach((col, index) => {
      if (col && columnMappings[col]) {
        mapping[col] = columnMappings[col];
      }
    });

    return mapping;
  }

  /**
   * Mappe les colonnes Excel COMPIL_CEC vers les champs TblImportExcelCel
   * Basé sur l'analyse du fichier COMPIL_CEC MARCORY 02.xlsm
   */
  mapCompilCecColumnsToDbFields(excelColumns: string[]): Record<string, { field: string; index: number; type: 'direct' | 'extract' | 'split' }> {
    const mapping: Record<string, { field: string; index: number; type: 'direct' | 'extract' | 'split' }> = {};
    
    excelColumns.forEach((col, index) => {
      if (!col) return;

      const colUpper = col.toUpperCase().trim();
      
      // Mapping direct
      if (colUpper === 'ORD') {
        mapping[col] = { field: 'ordre', index, type: 'direct' };
      } else if (colUpper === 'BV') {
        mapping[col] = { field: 'numeroBureauVote', index, type: 'direct' };
      } else if (colUpper === 'TOTAL INSCRIT') {
        mapping[col] = { field: 'populationTotale', index, type: 'direct' };
      } else if (colUpper === 'POPULATION ELECTORALE HOMMES') {
        mapping[col] = { field: 'populationHommes', index, type: 'direct' };
      } else if (colUpper === 'FEMMES' && index === 12) { // Première occurrence = population
        mapping[col] = { field: 'populationFemmes', index, type: 'direct' };
      } else if (colUpper === 'TOTAL' && index === 13) { // Première occurrence = population
        mapping[col] = { field: 'populationTotale', index, type: 'direct' };
      } else if (colUpper === 'PERS. ASTREINTE') {
        mapping[col] = { field: 'personnesAstreintes', index, type: 'direct' };
      } else if (colUpper === 'VOTANTS HOMMES') {
        mapping[col] = { field: 'votantsHommes', index, type: 'direct' };
      } else if (colUpper === 'FEMMES' && index === 17) { // Deuxième occurrence = votants
        mapping[col] = { field: 'votantsFemmes', index, type: 'direct' };
      } else if (colUpper === 'TOTAL' && index === 18) { // Deuxième occurrence = votants
        mapping[col] = { field: 'totalVotants', index, type: 'direct' };
      } else if (colUpper === 'TAUX DE PARTICIPATION') {
        mapping[col] = { field: 'tauxParticipation', index, type: 'direct' };
      } else if (colUpper === 'BULLETINS NULS') {
        mapping[col] = { field: 'bulletinsNuls', index, type: 'direct' };
      } else if (colUpper === 'BULLETINS BLANCS') {
        mapping[col] = { field: 'bulletinsBlancs', index, type: 'direct' };
      } else if (colUpper === 'SUFFR. EXPRIMES') {
        mapping[col] = { field: 'suffrageExprime', index, type: 'direct' };
      }
      // Mapping pour les scores des candidats
      else if (colUpper === 'GP-PAIX LAGOU ADJOUA HENRIETTE') {
        mapping[col] = { field: 'score1', index, type: 'direct' };
      } else if (colUpper === 'CODE BILLON JEAN-LOUIS EUGENE') {
        mapping[col] = { field: 'score2', index, type: 'direct' };
      } else if (colUpper === 'MGC EHIVET SIMONE ÉPOUSE GBAGBO') {
        mapping[col] = { field: 'score3', index, type: 'direct' };
      } else if (colUpper === 'INDEPENDANT DON-MELLO SENIN AHOUA JACOB') {
        mapping[col] = { field: 'score4', index, type: 'direct' };
      } else if (colUpper === 'RHDP ALASSANE OUATTARA') {
        mapping[col] = { field: 'score5', index, type: 'direct' };
      }
      // Mapping spécial pour la colonne CEC (extraction du code CEL et du lieu de vote)
      else if (colUpper.includes('CEC') && colUpper.includes('LIEU DE VOTE')) {
        mapping[col] = { field: 'referenceLieuVote', index, type: 'split' };
      }
    });

    return mapping;
  }

  /**
   * Extrait le code CEL et le lieu de vote de la colonne CEC
   */
  extractCelInfoFromCecColumn(cecValue: string): { codeCel: string; referenceLieuVote: string; libelleLieuVote: string } {
    if (!cecValue || typeof cecValue !== 'string') {
      return { codeCel: '', referenceLieuVote: '', libelleLieuVote: '' };
    }

    // Format attendu: "CEC MARCORY 02 LIEU DE VOTE TOTAL POURCENTAGE"
    // ou "022001006001" (référence du lieu de vote)
    
    // Si c'est une référence numérique (code du lieu de vote)
    if (/^\d+$/.test(cecValue.trim())) {
      return {
        codeCel: '',
        referenceLieuVote: cecValue.trim(),
        libelleLieuVote: ''
      };
    }

    // Si c'est le format complet CEC
    const parts = cecValue.split(' ');
    if (parts.length >= 3 && parts[0] === 'CEC') {
      const codeCel = `${parts[1]} ${parts[2]}`; // "MARCORY 02"
      const referenceLieuVote = parts[3] || ''; // Code du lieu de vote
      const libelleLieuVote = parts.slice(4).join(' '); // Reste = libellé
      
      return {
        codeCel,
        referenceLieuVote,
        libelleLieuVote
      };
    }

    return {
      codeCel: '',
      referenceLieuVote: cecValue,
      libelleLieuVote: ''
    };
  }

  /**
   * Analyse le fichier EPR_2025_COMPILATION_CEL pour comprendre sa structure
   */
  async analyzeEprFile(filePath: string): Promise<{
    structure: any;
    recommendations: string[];
  }> {
    const analysis = await this.analyzeExcelStructure(filePath);
    
    const recommendations: string[] = [];
    
    // Vérifier les colonnes attendues
    const expectedColumns = ['ORD', 'REF_LV', 'LIB_LV', 'NUMERO_BV', 'POP_HOM', 'POP_FEM'];
    const missingColumns = expectedColumns.filter(col => !analysis.columns.includes(col));
    
    if (missingColumns.length > 0) {
      recommendations.push(`Colonnes manquantes: ${missingColumns.join(', ')}`);
    }

    // Vérifier les colonnes de scores
    const scoreColumns = analysis.columns.filter(col => col.startsWith('SCORE_'));
    recommendations.push(`Colonnes de scores trouvées: ${scoreColumns.length} (${scoreColumns.join(', ')})`);

    // Analyser les données d'exemple
    if (analysis.sampleData.length > 0) {
      recommendations.push(`Données d'exemple trouvées: ${analysis.sampleData.length} lignes`);
    }

    return {
      structure: analysis,
      recommendations
    };
  }

  /**
   * Analyse spécifique pour les fichiers CEL (COMPIL_CEC format)
   * Structure : Lignes 6-11 = headers, Ligne 12+ = données
   */
  async analyzeCelFile(filePath: string, codeCellule: string, nombreBv?: number): Promise<{
    headers: string[];
    dataRows: any[];
    totalRowsToLoad: number;
    recommendations: string[];
  }> {
    try {
      const workbook = xlsx.readFile(filePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      // Extraire les headers (lignes 6-11)
      const headerRows = jsonData.slice(5, 11); // Index 5-10 = lignes 6-11
      const headers = this.extractHeaders(headerRows);

      // Calculer le nombre de lignes à charger
      let totalRowsToLoad = 12; // Minimum (headers + 1 ligne de données)
      if (nombreBv && nombreBv > 0) {
        totalRowsToLoad = 12 + nombreBv;
      }

      // Extraire les données (à partir de la ligne 12)
      const dataStartIndex = 11; // Index 11 = ligne 12
      const dataEndIndex = Math.min(totalRowsToLoad - 1, jsonData.length - 1);
      const dataRows = jsonData.slice(dataStartIndex, dataEndIndex + 1);

      const recommendations: string[] = [];
      recommendations.push(`Code CEL détecté: ${codeCellule}`);
      recommendations.push(`Nombre de BV attendu: ${nombreBv || 'Non spécifié'}`);
      recommendations.push(`Lignes à charger: ${totalRowsToLoad} (12 + ${nombreBv || 0})`);
      recommendations.push(`Headers trouvés: ${headers.length} colonnes`);
      recommendations.push(`Données extraites: ${dataRows.length} lignes`);

      return {
        headers,
        dataRows,
        totalRowsToLoad,
        recommendations
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse du fichier CEL: ${error.message}`);
    }
  }

  /**
   * Extrait les headers à partir des lignes 6-11
   */
  private extractHeaders(headerRows: any[][]): string[] {
    const headers: string[] = [];
    
    // Parcourir les 6 lignes d'en-têtes (lignes 6-11)
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
      const row = headerRows[rowIndex];
      if (row && Array.isArray(row)) {
        // Parcourir les colonnes de cette ligne
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          const cellValue = row[colIndex];
          if (cellValue && typeof cellValue === 'string' && cellValue.trim()) {
            // Si c'est la première ligne ou si la colonne n'a pas encore de header
            if (rowIndex === 0 || !headers[colIndex]) {
              headers[colIndex] = cellValue.trim();
            } else {
              // Combiner avec le header existant
              headers[colIndex] = `${headers[colIndex]} ${cellValue.trim()}`;
            }
          }
        }
      }
    }
    
    return headers.filter(header => header && header.trim());
  }
}
