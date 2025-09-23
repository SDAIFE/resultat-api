export class DashboardCelDto {
  id: string;
  codeCellule: string;
  libelleCellule: string;
  typeCellule?: string;
  etatResultatCellule?: string;
  nombreBureauxVote?: number;
  
  // Informations géographiques
  departement: {
    codeDepartement: string;
    libelleDepartement: string;
    codeRegion: string;
    libelleRegion: string;
  };
  
  // Informations d'import
  import: {
    aImporte: boolean;
    dateDernierImport?: Date;
    nomFichier?: string;
    statutImport?: string;
    messageErreur?: string;
  };
  
  // Statistiques
  statistiques: {
    totalLieuxVote: number;
    totalBureauxVote: number;
    totalInscrits: number;
    totalVotants: number;
    tauxParticipation: number;
  };
  
  // Utilisateur assigné
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export class DashboardCelListResponseDto {
  cels: DashboardCelDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  
  // Métadonnées de filtrage
  filtres: {
    statutImport?: string;
    typeCellule?: string;
    departement?: string;
    region?: string;
    utilisateur?: string;
  };
}

export class DashboardCelFilterDto {
  statutImport?: string;
  typeCellule?: string;
  departement?: string;
  region?: string;
  utilisateur?: string;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
}
