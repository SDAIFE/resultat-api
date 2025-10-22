import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

/**
 * DTO pour l'upload de fichiers Excel (.xlsm) + CSV
 * Le frontend envoie 2 fichiers simultanément :
 * - excelFile : Fichier .xlsm original
 * - csvFile : Fichier CSV converti par le frontend
 */
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

/**
 * DTO pour l'upload de fichiers CEL signés (PDF, images)
 */
export class UploadCelDto {
  @IsString({ message: 'Le code de la CEL est requis' })
  celCode: string;

  @IsString({ message: 'L\'ID de la CEL est requis' })
  celId: string;
}

/**
 * DTO pour l'upload de fichiers de consolidation
 */
export class UploadConsolidationDto {
  @IsString({ message: 'La référence est requise' })
  reference: string;

  @IsOptional()
  @IsString({ message: 'Le type doit être une chaîne' })
  type?: string;
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
  // Informations de l'utilisateur qui a importé
  importePar?: {
    id: string;
    numeroUtilisateur: string;
    nom: string;
    prenom: string;
    email: string;
    nomComplet: string;
    role?: {
      code: string;
      libelle: string;
    };
  };
  // Informations géographiques
  departement?: {
    codeDepartement: string;
    libelleDepartement: string;
  };
  region?: {
    codeRegion: string;
    libelleRegion: string;
  };
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
  personnesAstreintes: number; // ✅ AJOUTÉ
}

export class CelDataResponseDto {
  codeCellule: string;
  libelleCellule: string;
  totalBureaux: number;
  data: CelDataDto[];
  metrics: CelMetricsDto;
}
