import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export class UploadExcelDto {
  @IsString({ message: 'Le code de la CEL est requis' })
  codeCellule: string;

  @IsOptional()
  @IsString({ message: 'Le nom du fichier doit être une chaîne' })
  nomFichier?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de BV doit être un nombre' })
  nombreBv?: number;
}

export class ExcelImportResponseDto {
  id: string;
  codeCellule: string;
  nomFichier: string;
  statutImport: ImportStatus;
  messageErreur?: string;
  dateImport: Date;
  nombreLignesImportees: number;
  nombreLignesEnErreur: number;
  nombreBureauxVote?: number;
  details: {
    headers: string[];
    colonnesMappees: Record<string, string>;
    lignesTraitees: number;
    lignesReussies: number;
    lignesEchouees: number;
  };
}

export class ExcelImportListResponseDto {
  imports: ExcelImportResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ExcelImportStatsDto {
  totalImports: number;
  importsReussis: number;
  importsEnErreur: number;
  importsEnCours: number;
  totalLignesImportees: number;
  totalLignesEnErreur: number;
  tauxReussite: number;
  importsParCel: Record<string, number>;
  importsParStatut: Record<ImportStatus, number>;
}

export class CelDataDto {
  id: string;
  codeCellule: string;
  ordre: string;
  referenceLieuVote: string;
  libelleLieuVote: string;
  numeroBureauVote: string;
  populationHommes: string;
  populationFemmes: string;
  populationTotale: string;
  personnesAstreintes: string;
  votantsHommes: string;
  votantsFemmes: string;
  totalVotants: string;
  tauxParticipation: string;
  bulletinsNuls: string;
  suffrageExprime: string;
  bulletinsBlancs: string;
  score1: string;
  score2: string;
  score3: string;
  score4: string;
  score5: string;
}

export class CelMetricsDto {
  inscrits: {
    total: number;
    hommes: number;
    femmes: number;
  };
  votants: {
    total: number;
    hommes: number;
    femmes: number;
  };
  tauxParticipation: number;
  suffrageExprime: number;
}

export class CelDataResponseDto {
  codeCellule: string;
  libelleCellule: string;
  totalBureaux: number;
  data: CelDataDto[];
  metrics: CelMetricsDto;
}
