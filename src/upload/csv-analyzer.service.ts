import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvAnalyzerService {
  
  /**
   * Analyse la structure d'un fichier CSV pour comprendre les colonnes disponibles
   */
  async analyzeCsvStructure(filePath: string): Promise<{
    headers: string[];
    dataRows: any[][];
    totalRows: number;
    recommendations: string[];
  }> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Analyser les lignes 1-11 pour extraire les métadonnées
      const metadataLines = lines.slice(0, 11);
      const metadata = this.extractMetadata(metadataLines);
      
      // Les en-têtes sont sur la ligne 12 (index 11)
      const headerLine = lines[11]; // Index 11 = ligne 12
      const headers = this.parseCsvLine(headerLine);
      
      // Nettoyer les headers et créer des noms de colonnes plus clairs
      const cleanedHeaders = this.cleanHeaders(headers);
      
      // Les données commencent à partir de la ligne 13 (index 12)
      const dataLines = lines.slice(12);
      const dataRows = dataLines
        .filter(line => line.trim() && !line.startsWith(';')) // Ignorer les lignes vides et les lignes de séparateurs
        .map(line => this.parseCsvLine(line));
      
      const recommendations: string[] = [];
      recommendations.push(`Code CEL détecté: ${metadata.codeCel}`);
      recommendations.push(`Département: ${metadata.departement}`);
      recommendations.push(`Nombre de BV: ${metadata.nombreBv}`);
      recommendations.push(`Headers trouvés: ${headers.length} colonnes`);
      recommendations.push(`Données extraites: ${dataRows.length} lignes`);
      
      return {
        headers: cleanedHeaders,
        dataRows,
        totalRows: dataRows.length,
        recommendations
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse du fichier CSV: ${error.message}`);
    }
  }

  /**
   * Extrait les métadonnées des premières lignes du fichier CSV
   */
  private extractMetadata(metadataLines: string[]): {
    codeCel: string;
    departement: string;
    nombreBv: number;
    election: string;
  } {
    let codeCel = '';
    let departement = '';
    let nombreBv = 0;
    let election = '';

    for (const line of metadataLines) {
      const parts = line.split(';');
      
      // Ligne 1: Election
      if (line.includes('ELECTION DU PRESIDENT')) {
        election = parts[2]?.replace(/"/g, '').trim() || '';
      }
      
      // Ligne 3: Nombre de BV
      if (line.includes('NB BV')) {
        const bvMatch = line.match(/NB BV;(\d+)/);
        if (bvMatch) {
          nombreBv = parseInt(bvMatch[1]);
        }
      }
      
      // Ligne 5: Département
      if (line.includes('DEPARTEMENT :')) {
        departement = parts[2]?.replace(/"/g, '').trim() || '';
      }
      
      // Ligne 6: Code CEL
      if (line.includes('CEC MARCORY')) {
        const celMatch = line.match(/CEC (MARCORY \d+)/);
        if (celMatch) {
          codeCel = celMatch[1];
        }
      }
    }

    return { codeCel, departement, nombreBv, election };
  }

  /**
   * Parse une ligne CSV en tenant compte des guillemets et des points-virgules
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Ajouter le dernier élément
    result.push(current.trim());
    
    return result;
  }

  /**
   * Mappe les colonnes CSV vers les champs de la base de données
   * Basé sur l'analyse du fichier COMPIL_CEC MARCORY 02.csv
   */
  mapCsvColumnsToDbFields(csvColumns: string[]): Record<string, { field: string; index: number; type: 'direct' | 'extract' | 'split' }> {
    const mapping: Record<string, { field: string; index: number; type: 'direct' | 'extract' | 'split' }> = {};
    
    csvColumns.forEach((col, index) => {
      if (!col) return;

      const colUpper = col.toUpperCase().trim();
      
      // Mapping basé sur les noms de colonnes nettoyés
      if (colUpper === 'ORD') {
        mapping[col] = { field: 'ordre', index, type: 'direct' };
      } else if (colUpper === 'LIEU_DE_VOTE') {
        mapping[col] = { field: 'referenceLieuVote', index, type: 'direct' };
      } else if (colUpper === 'LIBELLE_LIEU_VOTE') {
        mapping[col] = { field: 'libelleLieuVote', index, type: 'direct' };
      } else if (colUpper === 'BV') {
        mapping[col] = { field: 'numeroBureauVote', index, type: 'direct' };
      } else if (colUpper === 'POP_HOM') {
        mapping[col] = { field: 'populationHommes', index, type: 'direct' };
      } else if (colUpper === 'POP_FEM') {
        mapping[col] = { field: 'populationFemmes', index, type: 'direct' };
      } else if (colUpper === 'POP_TOTAL') {
        mapping[col] = { field: 'populationTotale', index, type: 'direct' };
      } else if (colUpper === 'PERS_ASTREINTE') {
        mapping[col] = { field: 'personnesAstreintes', index, type: 'direct' };
      } else if (colUpper === 'VOT_HOM') {
        mapping[col] = { field: 'votantsHommes', index, type: 'direct' };
      } else if (colUpper === 'VOT_FEM') {
        mapping[col] = { field: 'votantsFemmes', index, type: 'direct' };
      } else if (colUpper === 'VOT_TOTAL') {
        mapping[col] = { field: 'totalVotants', index, type: 'direct' };
      } else if (colUpper === 'TAUX_PARTICIPATION') {
        mapping[col] = { field: 'tauxParticipation', index, type: 'direct' };
      } else if (colUpper === 'BULLETINS_NULS') {
        mapping[col] = { field: 'bulletinsNuls', index, type: 'direct' };
      } else if (colUpper === 'BULLETINS_BLANCS') {
        mapping[col] = { field: 'bulletinsBlancs', index, type: 'direct' };
      } else if (colUpper === 'SUFFR_EXPRIMES') {
        mapping[col] = { field: 'suffrageExprime', index, type: 'direct' };
      }
      // Mapping pour les scores des candidats
      else if (colUpper === 'SCORE_1') {
        mapping[col] = { field: 'score1', index, type: 'direct' };
      } else if (colUpper === 'SCORE_2') {
        mapping[col] = { field: 'score2', index, type: 'direct' };
      } else if (colUpper === 'SCORE_3') {
        mapping[col] = { field: 'score3', index, type: 'direct' };
      } else if (colUpper === 'SCORE_4') {
        mapping[col] = { field: 'score4', index, type: 'direct' };
      } else if (colUpper === 'SCORE_5') {
        mapping[col] = { field: 'score5', index, type: 'direct' };
      }
    });

    return mapping;
  }

  /**
   * Extrait le libellé du lieu de vote à partir des métadonnées
   * Le libellé se trouve dans les lignes de données (ex: "EPP ANCIEN KOUMASSI VILLAGE")
   */
  extractLieuVoteFromData(dataRows: any[][]): Record<string, string> {
    const lieuVoteMap: Record<string, string> = {};
    
    dataRows.forEach(row => {
      if (row.length > 2) {
        const referenceLieuVote = row[1]; // Colonne 2 = référence lieu de vote
        const libelleLieuVote = row[2]; // Colonne 3 = libellé lieu de vote
        
        if (referenceLieuVote && libelleLieuVote) {
          lieuVoteMap[referenceLieuVote] = libelleLieuVote;
        }
      }
    });
    
    return lieuVoteMap;
  }

  /**
   * Nettoie et organise les headers CSV
   */
  private cleanHeaders(headers: string[]): string[] {
    // Basé sur l'analyse du fichier CSV, créer des noms de colonnes clairs
    const cleanedHeaders: string[] = [];
    
    // Mapping basé sur l'analyse du fichier COMPIL_CEC MARCORY 02.csv
    const columnMapping = [
      'ORD',                    // 0: Numéro d'ordre
      'LIEU_DE_VOTE',          // 1: Code lieu de vote
      'LIBELLE_LIEU_VOTE',     // 2: Libellé lieu de vote
      'BV',                    // 3: Numéro bureau de vote
      'NB_SCORES_SAISIS',      // 4: Nombre scores saisis
      'NB_CELLULES_VIDES',     // 5: Nombre cellules vides
      'STATUT_SUPPRESSION',    // 6: Statut suppression
      'CONFIRMATION_SUPPRESSION', // 7: Confirmation suppression
      'BV_RETIRES',           // 8: BV retirés
      'DATE_VEROUILLAGE',     // 9: Date verrouillage
      'HEURE_VEROUILLAGE',    // 10: Heure verrouillage
      'POPULATION_ELECTORALE', // 11: Population électorale
      'POP_HOM',              // 12: Population hommes
      'POP_FEM',              // 13: Population femmes
      'POP_TOTAL',            // 14: Population totale
      'PERS_ASTREINTE',       // 15: Personnes astreintes
      'INSCRITS_LED',         // 16: Inscrits LED
      'VOT_HOM',              // 17: Votants hommes
      'VOT_FEM',              // 18: Votants femmes
      'VOT_TOTAL',            // 19: Total votants
      'TAUX_PARTICIPATION',   // 20: Taux participation
      'BULLETINS_NULS',       // 21: Bulletins nuls
      'VOID',                 // 22: Void
      'SUFFR_EXPRIMES',       // 23: Suffrages exprimés
      'BULLETINS_BLANCS',     // 24: Bulletins blancs
      'SCORE_1',              // 25: Score candidat 1 (GP-PAIX)
      'SCORE_2',              // 26: Score candidat 2 (CODE)
      'SCORE_3',              // 27: Score candidat 3 (MGC)
      'SCORE_4',              // 28: Score candidat 4 (INDEPENDANT)
      'SCORE_5',              // 29: Score candidat 5 (RHDP)
    ];

    // Utiliser le mapping ou créer des noms génériques
    for (let i = 0; i < Math.max(headers.length, 30); i++) {
      if (i < columnMapping.length) {
        cleanedHeaders[i] = columnMapping[i];
      } else {
        cleanedHeaders[i] = `COL_${i}`;
      }
    }

    return cleanedHeaders;
  }

  /**
   * Valide que le nom du fichier correspond au code de la CEL
   */
  validateFileName(fileName: string, celCode: string): boolean {
    const fileNameWithoutExt = path.parse(fileName).name;
    return fileNameWithoutExt.toUpperCase().includes(celCode.toUpperCase());
  }
}
