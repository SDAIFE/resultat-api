// DTOs pour les réponses de publication

export class DepartmentStatsResponse {
  totalDepartments: number;
  publishedDepartments: number;
  pendingDepartments: number;
  totalCels: number;
  importedCels: number;
  pendingCels: number;
  publicationRate: number;
}

export class CelData {
  codeCellule: string;
  libelleCellule: string;
  statut: 'N' | 'I' | 'P';
  dateImport?: string;
  nombreLignesImportees?: number;
  nombreLignesEnErreur?: number;
}

export class DepartmentData {
  id: string;
  codeDepartement: string;
  libelleDepartement: string;
  totalCels: number;
  importedCels: number;
  pendingCels: number;
  publicationStatus: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  lastUpdate: string;
  cels: CelData[];
}

export class DepartmentListResponse {
  departments: DepartmentData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PublicationActionResult {
  success: boolean;
  message: string;
  department?: DepartmentData;
  error?: string;
}

export class DepartmentDetailsResponse {
  department: DepartmentData;
  cels: {
    codeCellule: string;
    libelleCellule: string;
    statut: 'N' | 'I' | 'P';
    dateImport?: string;
    nombreLignesImportees: number;
    nombreLignesEnErreur: number;
  }[];
  history: {
    action: 'PUBLISH' | 'CANCEL' | 'IMPORT';
    timestamp: string;
    user: string;
    details?: string;
  }[];
}

export class DepartmentListQuery {
  page?: number;
  limit?: number;
  codeDepartement?: string;
  publicationStatus?: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  search?: string;
}

// ===========================================
// DTOs pour les données agrégées par département
// ===========================================

export class CelAggregatedData {
  codeCellule: string;
  libelleCellule: string;
  populationHommes: number;
  populationFemmes: number;
  populationTotale: number;
  personnesAstreintes: number;
  votantsHommes: number;
  votantsFemmes: number;
  totalVotants: number;
  tauxParticipation: number;
  bulletinsNuls: number;
  suffrageExprime: number;
  bulletinsBlancs: number;
  score1: number;
  score2: number;
  score3: number;
  score4: number;
  score5: number;
  nombreBureaux: number;
}

export class DepartmentAggregatedData {
  codeDepartement: string;
  libelleDepartement: string;
  inscrits: number;
  votants: number;
  participation: number;
  nombreBureaux: number;
  cels: CelAggregatedData[];
}

export class DepartmentDataResponse {
  departments: DepartmentAggregatedData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}