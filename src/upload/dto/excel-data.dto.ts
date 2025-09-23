export class ExcelDataRowDto {
  ordre?: string;
  referenceLieuVote?: string;
  libelleLieuVote?: string;
  numeroBureauVote?: string;
  populationHommes?: string;
  populationFemmes?: string;
  populationTotale?: string;
  personnesAstreintes?: string;
  votantsHommes?: string;
  votantsFemmes?: string;
  totalVotants?: string;
  tauxParticipation?: string;
  bulletinsNuls?: string;
  bulletinsBlancs?: string;
  suffrageExprime?: string;
  score1?: string;
  score2?: string;
  score3?: string;
  score4?: string;
  score5?: string;
  colonneZero?: string;
}

export class ExcelParsedDataDto {
  codeCellule: string;
  nomFichier: string;
  headers: string[];
  dataRows: ExcelDataRowDto[];
  mapping: Record<string, { field: string; index: number; type: string }>;
  nombreBv: number;
  nombreLignes: number;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class ExcelValidationResultDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  colonnesManquantes: string[];
  colonnesInconnues: string[];
  lignesEnErreur: Array<{
    ligne: number;
    erreurs: string[];
  }>;
}
