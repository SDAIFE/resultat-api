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
